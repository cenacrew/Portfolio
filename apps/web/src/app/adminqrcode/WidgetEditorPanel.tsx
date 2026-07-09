"use client";

import { useMemo } from "react";
import type { Breakpoint, Widget, WidgetSize } from "@portfolio/shared";
import { registry } from "@/widgets/registry";

// Slide-in editor for one widget: config form (from the registry), size chooser
// (sizes declared by the widget type), visibility and delete.
export default function WidgetEditorPanel({
  widget,
  bp,
  saving,
  onConfigChange,
  onPickSize,
  onToggleVisible,
  onSave,
  onDelete,
  onClose,
}: {
  widget: Widget;
  bp: Breakpoint;
  saving: boolean;
  onConfigChange: (config: unknown) => void;
  onPickSize: (size: WidgetSize) => void;
  onToggleVisible: () => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const def = registry[widget.type];
  const Editor = def.Editor;
  const current = widget.layout[bp];

  // Validate config live so Save can be blocked on invalid input.
  const error = useMemo<string | null>(() => {
    const res = def.schema.safeParse(widget.config);
    return res.success ? null : (res.error.issues[0]?.message ?? "Configuration invalide.");
  }, [widget.config, def]);

  return (
    <>
      <div className="admin-scrim" onClick={onClose} />
      <aside className="admin-drawer" role="dialog" aria-label={`Éditer ${def.label}`}>
        <header className="admin-drawer__head">
          <div>
            <span className="admin-drawer__eyebrow">Widget</span>
            <h2 className="admin-drawer__title">{def.label}</h2>
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="admin-drawer__body">
          <section className="admin-section">
            <span className="admin-section__label">Taille ({bp === "mobile" ? "mobile" : "bureau"})</span>
            <div className="admin-sizes">
              {def.sizes.map((s) => {
                const active = s.w === current.w && s.h === current.h;
                return (
                  <button
                    key={`${s.w}x${s.h}`}
                    className={`admin-size${active ? " is-active" : ""}`}
                    onClick={() => onPickSize(s)}
                  >
                    {s.w}×{s.h}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="admin-section">
            <div className="ed-field ed-field--row">
              <span className="ed-label">Visible sur le dashboard</span>
              <button
                type="button"
                role="switch"
                aria-checked={widget.visible}
                className={`ed-switch${widget.visible ? " is-on" : ""}`}
                onClick={onToggleVisible}
              >
                <span className="ed-switch__dot" />
              </button>
            </div>
          </section>

          {Editor ? (
            <section className="admin-section admin-section--form">
              <span className="admin-section__label">Contenu</span>
              <Editor config={widget.config} onChange={onConfigChange} />
            </section>
          ) : (
            <p className="ed-note">Ce widget n’a pas de contenu à éditer.</p>
          )}

          {error && <p className="admin-form-error">{error}</p>}
        </div>

        <footer className="admin-drawer__foot">
          <button className="admin-btn admin-btn--danger" onClick={onDelete} disabled={saving}>
            Supprimer
          </button>
          <button className="admin-btn admin-btn--primary" onClick={onSave} disabled={saving || !!error}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </footer>
      </aside>
    </>
  );
}
