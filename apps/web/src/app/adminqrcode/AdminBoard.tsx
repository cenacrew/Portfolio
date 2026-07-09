"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GRID, type Breakpoint, type GuestbookRow, type Widget, type WidgetSize, type WidgetType } from "@portfolio/shared";
import { registry } from "@/widgets/registry";
import ThemeToggle from "../qrcode/ThemeToggle";
import AdminTile from "./AdminTile";
import WidgetEditorPanel from "./WidgetEditorPanel";
import AddWidgetGallery from "./AddWidgetGallery";
import GuestbookModeration from "./GuestbookModeration";
import { deleteWidgetAction, patchWidgetAction, saveWidgetAction, signOutAction } from "./actions";

const GAP = 12;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function AdminBoard({
  initialWidgets,
  previews,
  messages,
}: {
  initialWidgets: Widget[];
  previews: Record<string, ReactNode>;
  messages: GuestbookRow[];
}) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [bp, setBp] = useState<Breakpoint>("mobile");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const cols = GRID[bp].columns;
  const gridRef = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState(96);

  // Measure the square unit so drag distances map to grid cells.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setUnit((w - (cols - 1) * GAP) / cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );

  const selected = useMemo(() => widgets.find((w) => w.id === selectedId) ?? null, [widgets, selectedId]);

  const mutate = useCallback((id: string, fn: (w: Widget) => Widget) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? fn(w) : w)));
  }, []);

  // ---- drag to reposition (current breakpoint) ----
  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const w = widgets.find((x) => x.id === id);
    if (!w) return;
    const step = unit + GAP;
    const dx = Math.round(event.delta.x / step);
    const dy = Math.round(event.delta.y / step);
    if (dx === 0 && dy === 0) return;
    const l = w.layout[bp];
    const nx = clamp(l.x + dx, 0, cols - l.w);
    const ny = Math.max(0, l.y + dy);
    const nextLayout = { ...w.layout, [bp]: { ...l, x: nx, y: ny } };
    mutate(id, (cur) => ({ ...cur, layout: nextLayout }));
    void persistLayout(id, nextLayout);
  }

  async function persistLayout(id: string, layout: Widget["layout"]) {
    try {
      await patchWidgetAction(id, { layout });
    } catch {
      /* optimistic; a refresh will reconcile */
    }
  }

  // ---- size ----
  function pickSize(id: string, size: WidgetSize) {
    const w = widgets.find((x) => x.id === id);
    if (!w) return;
    const l = w.layout[bp];
    const nw = Math.min(size.w, cols);
    const nx = clamp(l.x, 0, cols - nw);
    const nextLayout = { ...w.layout, [bp]: { x: nx, y: l.y, w: nw, h: size.h } };
    mutate(id, (cur) => ({ ...cur, layout: nextLayout }));
    void persistLayout(id, nextLayout);
  }

  // ---- visibility ----
  function toggleVisible(id: string) {
    const w = widgets.find((x) => x.id === id);
    if (!w) return;
    const next = !w.visible;
    mutate(id, (cur) => ({ ...cur, visible: next }));
    patchWidgetAction(id, { visible: next }).catch(() => {});
  }

  // ---- config edits (local until saved) ----
  function changeConfig(id: string, config: unknown) {
    mutate(id, (cur) => ({ ...cur, config }));
  }

  async function saveSelected() {
    if (!selected) return;
    const def = registry[selected.type];
    const res = def.schema.safeParse(selected.config);
    if (!res.success) return;
    setSaving(true);
    try {
      await saveWidgetAction({
        id: selected.id,
        type: selected.type,
        config: res.data,
        layout: selected.layout,
        visible: selected.visible,
        position: selected.position,
      });
      setSelectedId(null);
      router.refresh();
    } catch {
      /* keep drawer open on failure */
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteWidgetAction(selected.id);
      setWidgets((prev) => prev.filter((w) => w.id !== selected.id));
      setSelectedId(null);
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  }

  // ---- add widget ----
  async function addWidget(type: WidgetType) {
    const def = registry[type];
    const size = def.sizes[0];
    const bottom = (b: Breakpoint) =>
      widgets.reduce((max, w) => Math.max(max, w.layout[b].y + w.layout[b].h), 0);
    const sized = (b: Breakpoint) => ({
      x: 0,
      y: bottom(b),
      w: Math.min(size.w, GRID[b].columns),
      h: size.h,
    });
    const layout = { mobile: sized("mobile"), desktop: sized("desktop") };
    const position = widgets.reduce((max, w) => Math.max(max, w.position + 1), 0);

    setGalleryOpen(false);
    setSaving(true);
    try {
      const created = await saveWidgetAction({
        type,
        config: def.defaultConfig,
        layout,
        visible: true,
        position,
      });
      setWidgets((prev) => [...prev, created]);
      setSelectedId(created.id);
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__lead">
          <span className="admin-topbar__eyebrow">Console</span>
          <h1 className="admin-topbar__title">Dashboard</h1>
        </div>

        <div className="admin-seg" role="group" aria-label="Aperçu">
          <button className={`admin-seg__btn${bp === "mobile" ? " is-on" : ""}`} onClick={() => setBp("mobile")}>
            Mobile
          </button>
          <button className={`admin-seg__btn${bp === "desktop" ? " is-on" : ""}`} onClick={() => setBp("desktop")}>
            Bureau
          </button>
        </div>

        <div className="admin-topbar__actions">
          <ThemeToggle />
          <Link className="admin-icon-btn" href="/qrcode" target="_blank" title="Voir le site" aria-label="Voir le site">
            ↗
          </Link>
          <form action={signOutAction}>
            <button className="admin-btn admin-btn--ghost" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className={`admin-board admin-board--${bp}`}>
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div
            ref={gridRef}
            className="admin-grid"
            style={
              {
                "--cols": cols,
                "--unit": `${unit}px`,
                "--gap": `${GAP}px`,
              } as CSSProperties
            }
          >
            {widgets.map((w) => (
              <AdminTile
                key={w.id}
                widget={w}
                bp={bp}
                preview={previews[w.id]}
                selected={w.id === selectedId}
                onSelect={() => setSelectedId(w.id)}
                onToggleVisible={() => toggleVisible(w.id)}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <nav className="admin-dock">
        <button className="admin-btn admin-btn--primary" onClick={() => setGalleryOpen(true)}>
          + Ajouter un widget
        </button>
        <button className="admin-btn admin-btn--ghost" onClick={() => setModOpen(true)}>
          Livre d’or ({messages.length})
        </button>
      </nav>

      {selected && (
        <WidgetEditorPanel
          widget={selected}
          bp={bp}
          saving={saving}
          onConfigChange={(config) => changeConfig(selected.id, config)}
          onPickSize={(size) => pickSize(selected.id, size)}
          onToggleVisible={() => toggleVisible(selected.id)}
          onSave={saveSelected}
          onDelete={removeSelected}
          onClose={() => setSelectedId(null)}
        />
      )}

      {galleryOpen && <AddWidgetGallery onPick={addWidget} onClose={() => setGalleryOpen(false)} />}
      {modOpen && <GuestbookModeration messages={messages} onClose={() => setModOpen(false)} />}
    </div>
  );
}
