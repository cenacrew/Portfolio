/**
 * purge-orphan-media.ts — one-off Storage hygiene (phase 7 B5).
 *
 * Lists every object in the widget-media bucket, collects every path still
 * referenced (all widgets across all versions + site_settings), and reports the
 * orphans. The collaborative-canvas ARCHIVES (toile/archive/*) are intentional
 * and always excluded from purge.
 *
 * Dry-run by default (prints a report, deletes nothing). Pass --apply to delete.
 * Runs on Node >= 24 (native TypeScript execution, no build step).
 *
 *   Dry-run:  pnpm purge:media
 *   Apply:    pnpm purge:media -- --apply
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
 * environment, falling back to apps/web/.env.local. The service-role key is
 * required (listing + deleting bucket objects bypasses RLS) and is NEVER
 * committed.
 *
 * Self-contained on purpose (a standalone maintenance tool, no workspace
 * resolution): the path-extraction logic below MIRRORS
 * packages/shared/src/supabase/media.ts — keep the two in sync if a new
 * media-referencing widget type is added.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const BUCKET = "widget-media";
const STORAGE_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// ---- shared logic mirror (packages/shared/src/supabase/media.ts) -----------

function storagePathFromPublicUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  const i = url.indexOf(STORAGE_MARKER);
  if (i === -1) return null;
  let path = url.slice(i + STORAGE_MARKER.length);
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  return path || null;
}

interface MediaWidget {
  id: string;
  type: string;
  config: unknown;
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function extractMediaPaths(widget: MediaWidget): string[] {
  const paths = new Set<string>();
  const add = (url: unknown) => {
    const p = storagePathFromPublicUrl(url);
    if (p) paths.add(p);
  };
  const c = asObj(widget.config);
  switch (widget.type) {
    case "photo": {
      const images = Array.isArray(c.images) ? c.images : [];
      for (const img of images) add(asObj(img).src);
      break;
    }
    case "video":
      add(c.src);
      add(c.poster);
      break;
    case "file-download":
      add(c.fileUrl);
      break;
    case "toile":
      paths.add(`toile/${widget.id}.png`);
      break;
    default:
      break;
  }
  return [...paths];
}

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

async function listAll(client: SupabaseClient, prefix = ""): Promise<StoredObject[]> {
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
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Everything currently in the bucket.
  const objects = await listAll(client);

  // 2) Everything still referenced.
  const referenced = new Set<string>();
  const { data: widgets, error: wErr } = await client.from("widgets").select("id,type,config");
  if (wErr) throw wErr;
  for (const w of (widgets ?? []) as MediaWidget[]) {
    for (const p of extractMediaPaths(w)) referenced.add(p);
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
