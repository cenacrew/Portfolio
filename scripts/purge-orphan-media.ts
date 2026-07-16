/**
 * purge-orphan-media.ts — one-off Storage hygiene (phase 7 B5).
 *
 * Lists every object in the widget-media bucket, collects every path still
 * referenced (all widgets across all versions + site_settings), and reports the
 * orphans. The collaborative-canvas ARCHIVES (toile/archive/*) are intentional
 * and always excluded from purge.
 *
 * Dry-run by default (prints a report, deletes nothing). Pass --apply to delete.
 * Run via `pnpm purge:media` (tsx) — the runner resolves the @portfolio/shared
 * workspace package and its TypeScript sources, which bare `node` cannot (the
 * shared package uses extensionless ESM imports resolved by a bundler).
 *
 *   Dry-run:  pnpm purge:media
 *   Apply:    pnpm purge:media -- --apply
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
 * environment, falling back to apps/web/.env.local. The service-role key is
 * required (listing + deleting bucket objects bypasses RLS) and is NEVER
 * committed.
 *
 * The path-extraction logic is imported from @portfolio/shared (the single
 * source of truth) so this tool can never fall behind the app's notion of which
 * media a widget references — an earlier hand-rolled copy here classed
 * contact-card / cv-timeline media as orphans and would have deleted it.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createServiceClient,
  extractMediaPaths,
  storagePathFromPublicUrl,
  WIDGET_MEDIA_BUCKET,
  type DbClient,
  type MediaWidget,
} from "@portfolio/shared";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const BUCKET = WIDGET_MEDIA_BUCKET;

// ---- env + helpers ---------------------------------------------------------

function loadEnvFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

interface StoredObject {
  path: string;
  size: number;
}

async function listAll(client: DbClient, prefix = ""): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  const pageSize = 100;
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list(prefix, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const entries = data ?? [];
    for (const entry of entries) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with a null id and no metadata; recurse into them.
      if (entry.id === null || entry.metadata == null) {
        out.push(...(await listAll(client, full)));
      } else {
        const size = Number((entry.metadata as { size?: number }).size ?? 0);
        out.push({ path: full, size });
      }
    }
    if (entries.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

// Scan any JSON value for widget-media object paths (covers site_settings and
// any future media field without special-casing each one).
function collectPathsFromJson(value: unknown, into: Set<string>): void {
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      const p = storagePathFromPublicUrl(v);
      if (p) into.add(p);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
}

async function main(): Promise<void> {
  loadEnvFile(resolve(ROOT, "apps/web/.env.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Set them in the environment or in apps/web/.env.local.",
    );
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  const client = createServiceClient(url, serviceKey);

  // 1) Everything currently in the bucket.
  const objects = await listAll(client);

  // 2) Everything still referenced. `extractMediaPaths` is the app's own
  //    declaration of each widget's media; a deep JSON scan of the config runs
  //    alongside it (belt-and-braces) so a stray bucket URL in an as-yet
  //    undeclared field is still counted as referenced, never purged.
  const referenced = new Set<string>();
  const { data: widgets, error: wErr } = await client.from("widgets").select("id,type,config");
  if (wErr) throw wErr;
  for (const w of (widgets ?? []) as MediaWidget[]) {
    for (const p of extractMediaPaths(w)) referenced.add(p);
    collectPathsFromJson(w.config, referenced);
  }
  const { data: settings } = await client.from("site_settings").select("*");
  for (const row of settings ?? []) collectPathsFromJson(row, referenced);

  // 3) Orphans = listed − referenced − intentional archives.
  const isArchive = (p: string) => p.startsWith("toile/archive/");
  const orphans = objects.filter((o) => !referenced.has(o.path) && !isArchive(o.path));
  const archives = objects.filter((o) => isArchive(o.path));

  const total = objects.reduce((s, o) => s + o.size, 0);
  const orphanBytes = orphans.reduce((s, o) => s + o.size, 0);

  console.log(`\nBucket: ${BUCKET}`);
  console.log(`Objects:       ${objects.length} (${fmtBytes(total)})`);
  console.log(`Referenced:    ${referenced.size} path(s)`);
  console.log(`Archives kept: ${archives.length} (excluded from purge)`);
  console.log(`Orphans:       ${orphans.length} (${fmtBytes(orphanBytes)} reclaimable)\n`);

  if (orphans.length === 0) {
    console.log("Nothing to purge. Bucket is clean.");
    return;
  }

  for (const o of orphans.sort((a, b) => b.size - a.size)) {
    console.log(`  ${apply ? "delete" : "orphan"}  ${o.path}  (${fmtBytes(o.size)})`);
  }

  if (!apply) {
    console.log(`\nDry-run. Re-run with --apply to delete ${orphans.length} object(s).`);
    return;
  }

  const paths = orphans.map((o) => o.path);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await client.storage.from(BUCKET).remove(batch);
    if (error) throw error;
  }
  console.log(`\nDeleted ${paths.length} orphan object(s), reclaimed ${fmtBytes(orphanBytes)}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
