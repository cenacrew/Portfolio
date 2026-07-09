"use client";

import { WIDGET_TYPES, type WidgetType } from "@portfolio/shared";
import { registry } from "@/widgets/registry";

// Gallery of widget types to add to the board.
export default function AddWidgetGallery({
  onPick,
  onClose,
}: {
  onPick: (type: WidgetType) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="admin-scrim" onClick={onClose} />
      <aside className="admin-drawer admin-drawer--wide" role="dialog" aria-label="Ajouter un widget">
        <header className="admin-drawer__head">
          <div>
            <span className="admin-drawer__eyebrow">Ajouter</span>
            <h2 className="admin-drawer__title">Un widget</h2>
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="admin-drawer__body">
          <div className="admin-gallery">
            {WIDGET_TYPES.map((type) => {
              const def = registry[type as WidgetType];
              return (
                <button key={type} className="admin-gallery__item" onClick={() => onPick(type as WidgetType)}>
                  <span className="admin-gallery__name">{def.label}</span>
                  {def.description && <span className="admin-gallery__desc">{def.description}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
