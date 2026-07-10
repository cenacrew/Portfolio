"use client";

import { TECH_KEYS } from "@portfolio/shared";
import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { TechStackConfig } from "./schema";
import { TECHS } from "./techs";

export default function TechStackEditor({ config, onChange }: WidgetEditorProps<TechStackConfig>) {
  const toggle = (key: (typeof TECH_KEYS)[number]) => {
    const on = config.items.includes(key);
    const items = on
      ? config.items.filter((k) => k !== key)
      : [...config.items, key];
    onChange({ ...config, items });
  };

  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <div className="ed-field">
        <span className="ed-label">Technologies affichées</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {TECH_KEYS.map((key) => {
            const on = config.items.includes(key);
            const t = TECHS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={on}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--qr-line, #ccc)",
                  background: on ? t.bg : "transparent",
                  color: on ? t.fg : "inherit",
                  opacity: on ? 1 : 0.55,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
