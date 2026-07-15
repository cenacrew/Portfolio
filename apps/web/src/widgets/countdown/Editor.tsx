"use client";

import type { WidgetEditorProps } from "../types";
import { Field, SelectField, TextField } from "../editor-kit";
import { COUNTDOWN_DEFAULT_END_MESSAGE, type CountdownConfig, type CountdownEndBehavior } from "./schema";

const END_BEHAVIOR_OPTIONS: { value: CountdownEndBehavior; label: string }[] = [
  { value: "message", label: "Message de fin" },
  { value: "elapsed", label: "Compteur « depuis »" },
  { value: "hide", label: "Masquer la tuile" },
];

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
      <SelectField
        label="À l’échéance"
        value={config.endBehavior ?? "message"}
        options={END_BEHAVIOR_OPTIONS}
        onChange={(endBehavior) => onChange({ ...config, endBehavior })}
        hint="Ce qui s’affiche une fois la date atteinte."
      />
      {(config.endBehavior ?? "message") === "message" && (
        <TextField
          label="Message de fin"
          value={config.endMessage ?? ""}
          onChange={(endMessage) => onChange({ ...config, endMessage })}
          placeholder={COUNTDOWN_DEFAULT_END_MESSAGE}
        />
      )}
    </>
  );
}
