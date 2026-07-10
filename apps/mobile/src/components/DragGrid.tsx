import type { Breakpoint, WidgetLayout, WidgetRow } from "@portfolio/shared";
import { GRID, resolveCollisions } from "@portfolio/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { LinearTransition, runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { radius, useTheme } from "../lib/theme";
import { tap } from "./ui";
import { PreviewBody } from "./WidgetPreview";

// 2D drag grid (phase 4.6). A faithful, to-scale mirror of the public board for
// one breakpoint: tiles sit at their real grid cells with real proportions.
//
// Interaction, phone-home-screen style:
//   - a short tap opens the tile's management screen;
//   - a long-press picks the tile up, then dragging slides it around and the
//     other tiles FLOW out of the way live (deterministic push-down packing).
// Long-press-to-drag keeps tap and drag from fighting.
//
// Nothing is written here — the parent shows a "Save" button and batches the
// writes once the user is happy.

type Cell = { x: number; y: number; w: number; h: number };
type Cells = Record<string, Cell>;

function cellsFrom(widgets: WidgetRow[], bp: Breakpoint): Cells {
  const out: Cells = {};
  for (const w of widgets) {
    const l = w.layout[bp];
    out[w.id] = { x: l.x, y: l.y, w: l.w, h: l.h };
  }
  return out;
}

function boardRows(cells: Cells): number {
  let rows = 1;
  for (const c of Object.values(cells)) rows = Math.max(rows, c.y + c.h);
  return rows;
}

function sameCells(a: Cells, b: Cells): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => b[k] && a[k].x === b[k].x && a[k].y === b[k].y && a[k].w === b[k].w && a[k].h === b[k].h);
}

export function DragGrid({
  widgets,
  breakpoint,
  boardWidth,
  gap,
  onTapTile,
  onDirtyChange,
  registerGetCells,
}: {
  widgets: WidgetRow[];
  breakpoint: Breakpoint;
  boardWidth: number;
  gap: number;
  onTapTile: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  // Lets the parent read the current cells when the user taps "Save".
  registerGetCells: (getter: () => Cells) => void;
}) {
  const t = useTheme();
  const columns = GRID[breakpoint].columns;
  const unit = (boardWidth - gap * (columns - 1)) / columns;
  const stride = unit + gap;

  const initial = useMemo(() => cellsFrom(widgets, breakpoint), [widgets, breakpoint]);
  const [cells, setCells] = useState<Cells>(initial);
  const [dragId, setDragId] = useState<string | null>(null);

  // Reset the working copy whenever the source widgets or breakpoint change.
  useEffect(() => {
    setCells(initial);
    onDirtyChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  registerGetCells(() => cellsRef.current);

  // Snapshot taken when a drag starts, so reflow is stable and reversible
  // (always computed from the pre-drag layout, never from mid-drag state).
  const startRef = useRef<Cells>({});
  const targetRef = useRef<{ x: number; y: number } | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const px = (c: Cell) => ({ left: c.x * stride, top: c.y * stride, width: c.w * unit + (c.w - 1) * gap, height: c.h * unit + (c.h - 1) * gap });

  const begin = (id: string) => {
    startRef.current = { ...cellsRef.current };
    targetRef.current = { x: startRef.current[id].x, y: startRef.current[id].y };
    setDragId(id);
    tap();
  };

  const move = (id: string, dx: number, dy: number) => {
    const base = startRef.current[id];
    if (!base) return;
    const w = base.w;
    const h = base.h;
    const tXCell = Math.round((base.x * stride + dx) / stride);
    const tYCell = Math.round((base.y * stride + dy) / stride);
    const x = Math.max(0, Math.min(tXCell, columns - w));
    const y = Math.max(0, tYCell);
    const prev = targetRef.current;
    if (prev && prev.x === x && prev.y === y) return;
    targetRef.current = { x, y };
    // Reflow everyone around the pinned target, from the pre-drag snapshot.
    const rects = Object.entries(startRef.current).map(([wid, c]) => ({ id: wid, ...(wid === id ? { ...c, x, y } : c) }));
    const packed = resolveCollisions(rects, columns, id);
    setCells((cur) => {
      const next: Cells = { ...cur };
      for (const p of packed) {
        // Keep the dragged tile at its snapshot cell so its base px stays put
        // (the finger translate provides the visual movement).
        if (p.id === id) continue;
        next[p.id] = { x: p.x, y: p.y, w: p.w, h: p.h };
      }
      return next;
    });
  };

  const end = (id: string) => {
    const target = targetRef.current;
    setCells((cur) => {
      const next = { ...cur };
      if (target) next[id] = { ...next[id], x: target.x, y: target.y };
      onDirtyChange(!sameCells(next, initial));
      return next;
    });
    setDragId(null);
    tx.value = 0;
    ty.value = 0;
  };

  const rows = boardRows(cells);
  const boardHeight = rows * unit + (rows - 1) * gap;

  return (
    <View style={{ width: boardWidth, height: boardHeight, alignSelf: "center" }}>
      {widgets.map((w) => (
        <Tile
          key={w.id}
          row={w}
          cell={cells[w.id]}
          px={px}
          dragging={dragId === w.id}
          tx={tx}
          ty={ty}
          onBegin={() => begin(w.id)}
          onMove={(dx, dy) => move(w.id, dx, dy)}
          onEnd={() => end(w.id)}
          onTap={() => onTapTile(w.id)}
          t={t}
        />
      ))}
    </View>
  );
}

function Tile({
  row,
  cell,
  px,
  dragging,
  tx,
  ty,
  onBegin,
  onMove,
  onEnd,
  onTap,
  t,
}: {
  row: WidgetRow;
  cell: Cell;
  px: (c: Cell) => { left: number; top: number; width: number; height: number };
  dragging: boolean;
  tx: ReturnType<typeof useSharedValue<number>>;
  ty: ReturnType<typeof useSharedValue<number>>;
  onBegin: () => void;
  onMove: (dx: number, dy: number) => void;
  onEnd: () => void;
  onTap: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  const pan = Gesture.Pan()
    .activateAfterLongPress(170)
    .onStart(() => {
      "worklet";
      tx.value = 0;
      ty.value = 0;
      runOnJS(onBegin)();
    })
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX;
      ty.value = e.translationY;
      runOnJS(onMove)(e.translationX, e.translationY);
    })
    .onEnd(() => {
      "worklet";
      runOnJS(onEnd)();
    });

  const tapG = Gesture.Tap()
    .maxDuration(260)
    .onEnd((_e, ok) => {
      "worklet";
      if (ok) runOnJS(onTap)();
    });

  const gesture = Gesture.Exclusive(pan, tapG);

  const animStyle = useAnimatedStyle(() => {
    if (!dragging) return { transform: [], zIndex: 0 };
    return {
      transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1.05 }],
      zIndex: 50,
    };
  });

  const geo = px(cell);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={dragging ? undefined : LinearTransition.duration(180)}
        style={[
          {
            position: "absolute",
            left: geo.left,
            top: geo.top,
            width: geo.width,
            height: geo.height,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: dragging ? t.accent : t.border,
            backgroundColor: t.surface,
            padding: 10,
            overflow: "hidden",
            opacity: row.visible ? 1 : 0.5,
            shadowColor: "#000",
            shadowOpacity: dragging ? 0.3 : 0,
            shadowRadius: dragging ? 12 : 0,
            shadowOffset: { width: 0, height: 6 },
            elevation: dragging ? 10 : 0,
          },
          animStyle,
        ]}
      >
        <PreviewBody row={row} t={t} />
        {!row.visible ? (
          <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: t.overlay, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>MASQUÉ</Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

// Re-exported for callers that need the layout shape.
export type { WidgetLayout };
