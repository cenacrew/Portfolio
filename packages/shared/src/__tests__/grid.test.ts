import { describe, it, expect } from "vitest";
import {
  resolveCollisions,
  hasCollisions,
  GRID,
  type CellRect,
} from "../grid";

// Helper: a rectangle carrying an id, the shape resolveCollisions expects.
type Item = CellRect & { id: string };
const r = (id: string, x: number, y: number, w: number, h: number): Item => ({ id, x, y, w, h });

// Brute-force overlap check on a resolved set, used as the invariant every
// case must satisfy: the resolver must NEVER emit two overlapping tiles.
function anyOverlap(items: readonly CellRect[]): boolean {
  return hasCollisions(items);
}

// Assert no rectangle spills past the column count (width clamp guarantee).
function withinColumns(items: readonly CellRect[], columns: number): boolean {
  return items.every((i) => i.x >= 0 && i.w >= 1 && i.x + i.w <= columns);
}

describe("hasCollisions", () => {
  it("detects a real overlap", () => {
    expect(hasCollisions([r("a", 0, 0, 2, 2), r("b", 1, 1, 2, 2)])).toBe(true);
  });

  it("returns false for a disjoint set", () => {
    expect(hasCollisions([r("a", 0, 0, 1, 1), r("b", 1, 0, 1, 1), r("c", 0, 1, 2, 1)])).toBe(false);
  });

  it("treats edge-adjacent tiles as non-overlapping", () => {
    // b starts exactly where a ends on x — touching, not overlapping.
    expect(hasCollisions([r("a", 0, 0, 2, 1), r("b", 2, 0, 1, 1)])).toBe(false);
  });

  it("is empty-safe", () => {
    expect(hasCollisions([])).toBe(false);
  });
});

describe("resolveCollisions — basics", () => {
  it("leaves an already-packed top-anchored layout untouched", () => {
    const input = [r("a", 0, 0, 1, 1), r("b", 1, 0, 1, 1), r("c", 2, 0, 1, 1)];
    const out = resolveCollisions(input, 3);
    expect(out).toEqual(input);
    expect(anyOverlap(out)).toBe(false);
  });

  it("preserves the original array order in the output", () => {
    const out = resolveCollisions([r("c", 0, 0, 1, 1), r("a", 1, 0, 1, 1), r("b", 2, 0, 1, 1)], 3);
    expect(out.map((o) => o.id)).toEqual(["c", "a", "b"]);
  });

  it("pushes a colliding tile straight down", () => {
    const out = resolveCollisions([r("a", 0, 0, 1, 1), r("b", 0, 0, 1, 1)], 3);
    const b = out.find((o) => o.id === "b")!;
    expect(b).toMatchObject({ x: 0, y: 1 });
    expect(anyOverlap(out)).toBe(false);
  });

  it("stacks a full cascade of same-cell tiles vertically", () => {
    const out = resolveCollisions(
      [r("a", 0, 0, 1, 1), r("b", 0, 0, 1, 1), r("c", 0, 0, 1, 1), r("d", 0, 0, 1, 1)],
      3,
    );
    const ys = out.map((o) => o.y).sort((m, n) => m - n);
    expect(ys).toEqual([0, 1, 2, 3]);
    expect(anyOverlap(out)).toBe(false);
  });

  it("flows tiles around a large anchor without overlap", () => {
    // A 2x2 block plus three 1x1 all requesting cells the block covers.
    const out = resolveCollisions(
      [r("big", 0, 0, 2, 2), r("a", 0, 0, 1, 1), r("b", 1, 0, 1, 1), r("c", 0, 1, 1, 1)],
      3,
    );
    expect(anyOverlap(out)).toBe(false);
    expect(withinColumns(out, 3)).toBe(true);
  });
});

describe("resolveCollisions — grid edges and clamping", () => {
  it("clamps a tile wider than the grid to the column count", () => {
    const out = resolveCollisions([r("a", 0, 0, 5, 1)], 3);
    expect(out[0]).toMatchObject({ x: 0, w: 3 });
  });

  it("pulls x back so the tile fits inside the right edge", () => {
    const out = resolveCollisions([r("a", 2, 0, 2, 1)], 3);
    // x clamped to columns - w = 3 - 2 = 1.
    expect(out[0]).toMatchObject({ x: 1, w: 2 });
    expect(withinColumns(out, 3)).toBe(true);
  });

  it("clamps negative coordinates and zero sizes to the valid range", () => {
    const out = resolveCollisions([{ id: "a", x: -4, y: -2, w: 0, h: 0 } as Item], 3);
    expect(out[0].x).toBeGreaterThanOrEqual(0);
    expect(out[0].y).toBeGreaterThanOrEqual(0);
    expect(out[0].w).toBeGreaterThanOrEqual(1);
    expect(out[0].h).toBeGreaterThanOrEqual(1);
  });
});

describe("resolveCollisions — empty-row compaction", () => {
  it("pulls the board up over fully empty leading rows", () => {
    const out = resolveCollisions([r("a", 0, 2, 1, 1)], 3);
    expect(out[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("collapses a fully empty row between two tiles", () => {
    const out = resolveCollisions([r("a", 0, 0, 1, 1), r("b", 0, 2, 1, 1)], 3);
    const b = out.find((o) => o.id === "b")!;
    expect(b.y).toBe(1);
  });

  it("keeps an intra-row gap (only fully empty rows collapse)", () => {
    // Row 0 has cols 0 and 2 occupied, col 1 is an intentional gap; row 1 full.
    const input = [r("a", 0, 0, 1, 1), r("c", 2, 0, 1, 1), r("b", 0, 1, 3, 1)];
    const out = resolveCollisions(input, 3);
    expect(out).toEqual(input);
    expect(anyOverlap(out)).toBe(false);
  });

  it("does NOT compact while a tile is pinned (live drag)", () => {
    // Pinned tile sits low; without compaction it must keep its exact row.
    const out = resolveCollisions([r("p", 1, 3, 1, 1), r("a", 0, 0, 1, 1)], 3, "p");
    const p = out.find((o) => o.id === "p")!;
    expect(p).toMatchObject({ x: 1, y: 3 });
    expect(anyOverlap(out)).toBe(false);
  });
});

describe("resolveCollisions — pinned tile wins its cell", () => {
  it("places the pinned tile first and flows others around it", () => {
    const out = resolveCollisions([r("a", 0, 0, 2, 2), r("p", 1, 1, 1, 1)], 3, "p");
    const p = out.find((o) => o.id === "p")!;
    const a = out.find((o) => o.id === "a")!;
    expect(p).toMatchObject({ x: 1, y: 1 });
    expect(anyOverlap(out)).toBe(false);
    // The previously-overlapping big tile had to move off the pinned cell.
    expect(a.y).toBeGreaterThan(0);
  });
});

describe("resolveCollisions — both real breakpoints", () => {
  for (const bp of ["mobile", "desktop"] as const) {
    const cols = GRID[bp].columns;
    it(`never emits overlaps at ${bp} (${cols} cols) on a messy input`, () => {
      const messy: Item[] = [
        r("a", 0, 0, cols, 1),
        r("b", 0, 0, 2, 2),
        r("c", 1, 0, 2, 1),
        r("d", 0, 1, 1, 3),
        r("e", cols - 1, 0, 3, 2), // spills past the right edge on purpose
        r("f", 0, 5, 2, 2),
      ];
      const out = resolveCollisions(messy, cols);
      expect(anyOverlap(out)).toBe(false);
      expect(withinColumns(out, cols)).toBe(true);
    });
  }
});

describe("resolveCollisions — determinism", () => {
  it("is a pure function (same input → identical output twice)", () => {
    const input = [r("a", 0, 0, 2, 2), r("b", 1, 1, 2, 1), r("c", 0, 0, 1, 1)];
    const a = resolveCollisions(input, 3);
    const b = resolveCollisions(input, 3);
    expect(a).toEqual(b);
  });

  it("does not mutate the input array or its items", () => {
    const input = [r("a", 0, 3, 1, 1)];
    const snapshot = JSON.parse(JSON.stringify(input));
    resolveCollisions(input, 3);
    expect(input).toEqual(snapshot);
  });
});
