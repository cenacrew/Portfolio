// Remap desktop layouts from the 5-column grid to the new 9-column grid
// (phase 4.8 B1), and retire the status widget into the header (B2).
//
// What it does, idempotently:
//   1. If a `status` widget exists, copy its emoji / text / custom moods onto
//      site_settings (status_emoji / status_text / status_moods) so the header
//      keeps the current status, then delete the status widget row(s).
//   2. Rescale every remaining widget's DESKTOP layout: x and w × 9/5 (rounded,
//      clamped), preserving visual proportions. Mobile (3 cols) is untouched.
//   3. Run the shared anti-overlap + empty-row compaction so nothing overlaps.
//
// Idempotency: the remap only runs when the desktop layouts still look like
// 5-column data (no tile reaches past column 5). Re-running after a successful
// remap is a no-op for step 2; steps 1 and 3 are naturally idempotent.
//
// Usage (orchestrator runs this after merge, AFTER migration 0006):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/remap-desktop-9cols.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const OLD_COLS = 5;
const NEW_COLS = 9;
const COLUMNS = { mobile: 3, desktop: NEW_COLS };

// Same deterministic packer as packages/shared/src/grid.ts (inlined, no build).
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function compactEmptyRows(rects) {
  let maxRow = 0;
  for (const r of rects) maxRow = Math.max(maxRow, r.y + r.h);
  for (let row = 0; row < maxRow; row++) {
    const occupied = rects.some((r) => r.y <= row && row < r.y + r.h);
    if (occupied) continue;
    for (const r of rects) if (r.y > row) r.y -= 1;
    row -= 1;
    maxRow -= 1;
  }
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
  compactEmptyRows(placed);
  return items.map((item, i) => ({ ...item, ...resolved.get(i) }));
}

// Rescale one axis value from OLD_COLS to NEW_COLS space.
function scale(v) {
  return Math.round((v * NEW_COLS) / OLD_COLS);
}

const client = createClient(URL, KEY, { auth: { persistSession: false } });

// ---------- step 1: status widget -> header --------------------------------
const { data: rows, error } = await client.from("widgets").select("id, type, config, layout, position").order("position");
if (error) {
  console.error("Failed to read widgets:", error.message);
  process.exit(1);
}

const statusRows = rows.filter((r) => r.type === "status");
if (statusRows.length > 0) {
  const src = statusRows[0].config ?? {};
  const patch = {
    id: 1,
    status_emoji: typeof src.emoji === "string" && src.emoji ? src.emoji : "💻",
    status_text: typeof src.text === "string" && src.text ? src.text : "En train de coder",
    status_moods: Array.isArray(src.extraMoods) ? src.extraMoods : [],
  };
  const { error: upErr } = await client.from("site_settings").upsert(patch, { onConflict: "id" });
  if (upErr) {
    console.error("Failed to write status to site_settings:", upErr.message);
    process.exit(1);
  }
  for (const s of statusRows) {
    const { error: delErr } = await client.from("widgets").delete().eq("id", s.id);
    if (delErr) {
      console.error(`Failed to delete status widget ${s.id}:`, delErr.message);
      process.exit(1);
    }
    console.log(`Moved status widget ${s.id} to header and deleted it.`);
  }
}

const remaining = rows.filter((r) => r.type !== "status");

// ---------- step 2: rescale desktop layouts 5 -> 9 -------------------------
const alreadyRemapped = remaining.some((r) => r.layout?.desktop && r.layout.desktop.x + r.layout.desktop.w > OLD_COLS);
if (alreadyRemapped) {
  console.log("Desktop layouts already exceed 5 columns — skipping the ×9/5 rescale (idempotent).");
}

const next = new Map(remaining.map((r) => [r.id, structuredClone(r.layout)]));

if (!alreadyRemapped) {
  for (const r of remaining) {
    const d = r.layout.desktop;
    const w = Math.max(1, Math.min(scale(d.w), NEW_COLS));
    const x = Math.max(0, Math.min(scale(d.x), NEW_COLS - w));
    next.get(r.id).desktop = { x, y: d.y, w, h: d.h };
  }
}

// ---------- step 3: anti-overlap + compaction per breakpoint ---------------
const ordered = [...remaining].sort((a, b) => a.position - b.position);
for (const bp of ["mobile", "desktop"]) {
  const rects = ordered.map((r) => ({ id: r.id, ...next.get(r.id)[bp] }));
  const packed = resolveCollisions(rects, COLUMNS[bp]);
  for (const p of packed) next.get(p.id)[bp] = { x: p.x, y: p.y, w: p.w, h: p.h };
}

// ---------- write changed rows ---------------------------------------------
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
  console.log(`Remapped ${r.id}`);
}

console.log(`Done. ${statusRows.length} status widget(s) retired, ${changed} layout(s) rewritten of ${ordered.length}.`);
