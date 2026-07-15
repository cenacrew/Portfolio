/**
 * compute-widget-hashes.ts — QA detection manifest (phase 9 A1).
 *
 * For every widget type, computes a stable sha256 over its code (the whole
 * apps/web/src/widgets/<type>/ folder + its shared Zod schema in
 * packages/shared/src/widget-configs/<type>.ts) and writes the result to
 * apps/web/src/widgets/qa-manifest.json.
 *
 * The QA console (/adminqrcode/test) compares each type's current hash to the
 * human-validated hash stored in the widget_qa table: a mismatch (or no stored
 * hash) means "to verify". So editing a widget's Renderer/schema flips it back
 * to "to verify" on the next build — which is exactly the intent.
 *
 * Runs on Node >= 24 (native TypeScript execution, no build step). Wired as the
 * `prebuild` of apps/web, so it regenerates on every `pnpm build` — including on
 * Vercel (Root Directory = apps/web; this file is reached via ../../scripts).
 *
 * The manifest is DETERMINISTIC (sorted, no timestamps) and committed to git so
 * it exists in dev / type-check without a build; a build simply rewrites it to
 * the same bytes unless a widget's code actually changed.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const WIDGETS_DIR = join(ROOT, "apps", "web", "src", "widgets");
const SHARED_CONFIGS_DIR = join(ROOT, "packages", "shared", "src", "widget-configs");
const OUT_FILE = join(WIDGETS_DIR, "qa-manifest.json");

// Every file path under `dir`, recursively, sorted for a stable hash.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

// A folder is a widget type iff it holds a schema.ts (rules out ui/ helpers).
function widgetTypes(): string[] {
  return readdirSync(WIDGETS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(WIDGETS_DIR, e.name, "schema.ts")))
    .map((e) => e.name)
    .sort();
}

// sha256 over the type's folder + its shared schema file. Each file contributes
// its repo-relative path AND its bytes, so a rename or an edit both change the
// hash. Uses \n-normalised content so CRLF/LF checkouts hash identically.
function hashType(type: string): string {
  const h = createHash("sha256");
  const files = walk(join(WIDGETS_DIR, type));
  const sharedConfig = join(SHARED_CONFIGS_DIR, `${type}.ts`);
  if (existsSync(sharedConfig) && statSync(sharedConfig).isFile()) files.push(sharedConfig);
  for (const file of files.sort()) {
    const rel = relative(ROOT, file).split("\\").join("/");
    const body = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    h.update(rel);
    h.update("\0");
    h.update(body);
    h.update("\0");
  }
  return h.digest("hex");
}

function main(): void {
  // Build with sorted keys so the serialized object is deterministic.
  const hashes: Record<string, string> = {};
  for (const type of widgetTypes().sort()) hashes[type] = hashType(type);
  // Trailing newline → deterministic, diff-friendly file.
  const json = JSON.stringify({ hashes }, null, 2) + "\n";
  writeFileSync(OUT_FILE, json, "utf8");
  const rel = relative(ROOT, OUT_FILE).split("\\").join("/");
  console.log(`[qa] wrote ${rel} (${Object.keys(hashes).length} widget types)`);
}

main();
