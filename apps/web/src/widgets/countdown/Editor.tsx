"use client";

import type { WidgetEditorProps } from "../types";
import { Field, TextField } from "../editor-kit";
import type { CountdownConfig } from "./schema";

// ISO <-> value accepted by <input type="datetime-local"> (local, no seconds).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CountdownEditor({ config, onChange }: WidgetEditorProps<CountdownConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Emoji" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} maxLength={4} />
      <Field label="Date cible">
        <input
          className="ed-input"
          type="datetime-local"
          value={toLocalInput(config.target)}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) onChange({ ...config, target: d.toISOString() });
          }}
        />
      </Field>
    </>
  );
}
