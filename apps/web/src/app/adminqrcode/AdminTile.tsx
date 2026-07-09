"use client";

import type { CSSProperties, ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Breakpoint, Widget } from "@portfolio/shared";
import { registry } from "@/widgets/registry";

// One editable tile on the admin board. The top bar is the drag handle (touch
// friendly); the body is the live widget preview and opens the editor on tap.
export default function AdminTile({
  widget,
  bp,
  preview,
  selected,
  onSelect,
  onToggleVisible,
}: {
  widget: Widget;
  bp: Breakpoint;
  preview: ReactNode;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
}) {
  const def = registry[widget.type];
  const l = widget.layout[bp];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: widget.id });

  const style: CSSProperties = {
    gridColumn: `${l.x + 1} / span ${l.w}`,
    gridRow: `${l.y + 1} / span ${l.h}`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`admin-tile${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}${
        widget.visible ? "" : " is-hidden"
      }`}
    >
      <div className="admin-tile__bar">
        <button
          className="admin-tile__handle"
          aria-label="Déplacer"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden>
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>
        <span className="admin-tile__type">{def.label}</span>
        <button
          className="admin-tile__mini"
          aria-label={widget.visible ? "Masquer" : "Afficher"}
          title={widget.visible ? "Masquer" : "Afficher"}
          onClick={onToggleVisible}
        >
          {widget.visible ? "◕" : "○"}
        </button>
        <button className="admin-tile__mini" aria-label="Éditer" title="Éditer" onClick={onSelect}>
          ✎
        </button>
      </div>

      <button
        className={`admin-tile__preview${def.bleed ? " admin-tile__preview--bleed" : ""}`}
        onClick={onSelect}
        aria-label={`Éditer ${def.label}`}
      >
        <span className="admin-tile__previewInner" aria-hidden>
          {preview}
        </span>
      </button>
    </article>
  );
}
