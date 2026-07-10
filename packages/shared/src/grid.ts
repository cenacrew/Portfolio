// Bento grid constants shared across web (and future mobile) apps.
// Desktop = 4 columns, mobile = 3 columns (explicit product decision:
// more freedom than bento.me's 2 columns). Cells are square; row height
// equals column width and the gap is constant.

export const GRID = {
  mobile: { columns: 3 },
  desktop: { columns: 5 },
} as const;

export type Breakpoint = keyof typeof GRID;

export type WidgetSize = { w: number; h: number };

// Universal sizes (phase 4.5): every widget type is offered in all 9 formats,
// and each Renderer adapts its layout per format (no dumb crop). Shared so web
// and mobile propose exactly the same grid. Order = reading order in pickers.
export const UNIVERSAL_SIZES: readonly WidgetSize[] = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 3, h: 1 },
  { w: 3, h: 2 },
  { w: 3, h: 3 },
  { w: 1, h: 3 },
  { w: 2, h: 3 },
] as const;

// Back-compat alias (was the phase-3 resize list). Now the universal set.
export const WIDGET_SIZES = UNIVERSAL_SIZES;

// ---------------------------------------------------------------------------
// Collision resolution (phase 4.6)
//
// One deterministic packer shared by three call sites:
//   - the public web loader, as a last-resort defence so a bad DB row can never
//     render two overlapping tiles (point 6);
//   - the mobile 2D drag grid, to push tiles out of the way "Android home
//     screen" style while a tile is dragged (point 3);
//   - the offline repair script that rewrites overlapping layouts in the DB.
//
// Model: gravity is OFF (a tile keeps its x/y unless it has to move). Tiles are
// placed in reading order; when a tile would overlap already-placed cells it is
// pushed straight DOWN, one row at a time, until it fits. An optional `pinnedId`
// is placed first at its exact requested cell so the dragged tile "wins" and
// everything else flows around it.
// ---------------------------------------------------------------------------

export type CellRect = { x: number; y: number; w: number; h: number };
export type PlacedItem<T extends CellRect = CellRect> = T;

function overlaps(a: CellRect, b: CellRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Resolve a set of rectangles so none overlap, pushing conflicts down. Returns a
// NEW array (same order as input) with corrected x/y; w/h are clamped to fit the
// column count. Pure and deterministic: same input → same output.
export function resolveCollisions<T extends CellRect>(
  items: readonly T[],
  columns: number,
  pinnedId?: string,
  idOf: (item: T) => string = (item) => (item as unknown as { id: string }).id,
): T[] {
  // Order: the pinned (dragged) tile first, then reading order (y, then x).
  const indexed = items.map((item, i) => ({ item, i }));
  indexed.sort((a, b) => {
    const ap = pinnedId != null && idOf(a.item) === pinnedId;
    const bp = pinnedId != null && idOf(b.item) === pinnedId;
    if (ap !== bp) return ap ? -1 : 1;
    if (a.item.y !== b.item.y) return a.item.y - b.item.y;
    if (a.item.x !== b.item.x) return a.item.x - b.item.x;
    return a.i - b.i;
  });

  const placed: CellRect[] = [];
  const resolved = new Map<number, CellRect>();

  for (const { item, i } of indexed) {
    const w = Math.max(1, Math.min(item.w, columns));
    const h = Math.max(1, item.h);
    const x = Math.max(0, Math.min(item.x, columns - w));
    let y = Math.max(0, item.y);
    // Push down until the rectangle clears every already-placed tile.
    while (placed.some((p) => overlaps({ x, y, w, h }, p))) y += 1;
    const rect = { x, y, w, h };
    placed.push(rect);
    resolved.set(i, rect);
  }

  // Re-emit in the original order with corrected coordinates.
  return items.map((item, i) => {
    const r = resolved.get(i)!;
    return { ...item, x: r.x, y: r.y, w: r.w, h: r.h };
  });
}

// True when any two rectangles in the set overlap (used to skip needless writes).
export function hasCollisions(items: readonly CellRect[]): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) return true;
    }
  }
  return false;
}
