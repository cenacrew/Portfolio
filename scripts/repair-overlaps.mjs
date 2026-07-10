// Repair overlapping widget layouts in the production DB (phase 4.6, point 6).
//
// Some rows in the `widgets` table have layouts whose tiles overlap on a
// breakpoint (e.g. the weather tile over the status tile in the user's report).
// The public renderer now de-overlaps defensively at render time, but this
// script fixes the stored data once so the admin app and DB reflect reality.
//
// Idempotent: it only writes rows whose layout actually changes, and running it
// again on already-clean data is a no-op.
//
// Usage (the orchestrator runs this after merge):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/repair-overlaps.mjs
// It also accepts NEXT_PUBLIC_SUPABASE_URL as a fallback for the URL.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const COLUMNS = { mobile: 3, desktop: 5 };

// Same deterministic packer as packages/shared/src/grid.ts (inlined so this
// script has no build step). Gravity off: keep each tile's cell unless it must
// move, push conflicts straight down. Reading order (y, then x) is stable.
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollisions(items, columns) {
  const indexed = items.map((item, i) => ({ item, i }));
  indexed.sort((a, b) => {
    if (a.item.y !== b.item.y) return a.item.y - b.item.y;
    if (a.item.x !== b.item.x) return a.item.x - b.item.x;
    return a.i - b.i;
  });
  const placed = [];
  const resolved = new Map();
  for (const { item, i } of indexed) {
    const w = Math.max(1, Math.min(item.w, columns));
    const h = Math.max(1, item.h);
    const x = Math.max(0, Math.min(item.x, columns - w));
    let y = Math.max(0, item.y);
    while (placed.some((p) => overlaps({ x, y, w, h }, p))) y += 1;
    const rect = { x, y, w, h };
    placed.push(rect);
    resolved.set(i, rect);
  }
  return items.map((item, i) => ({ ...item, ...resolved.get(i) }));
}

const client = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: rows, error } = await client.from("widgets").select("id, layout, position").order("position");
if (error) {
  console.error("Failed to read widgets:", error.message);
  process.exit(1);
}

// Repack each breakpoint together, preserving reading order via `position`.
const ordered = [...rows].sort((a, b) => a.position - b.position);
const next = new Map(ordered.map((r) => [r.id, structuredClone(r.layout)]));

for (const bp of ["mobile", "desktop"]) {
  const rects = ordered.map((r) => ({ id: r.id, ...r.layout[bp] }));
  const packed = resolveCollisions(rects, COLUMNS[bp]);
  for (const p of packed) {
    const l = next.get(p.id);
    l[bp] = { x: p.x, y: p.y, w: p.w, h: p.h };
  }
}

let changed = 0;
for (const r of ordered) {
  const after = next.get(r.id);
  if (JSON.stringify(after) === JSON.stringify(r.layout)) continue;
  const { error: upErr } = await client.from("widgets").update({ layout: after }).eq("id", r.id);
  if (upErr) {
    console.error(`Failed to update ${r.id}:`, upErr.message);
    process.exit(1);
  }
  changed += 1;
  console.log(`Repaired ${r.id}`);
}

console.log(`Done. ${changed} widget(s) repaired out of ${ordered.length}.`);
