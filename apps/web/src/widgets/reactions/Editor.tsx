"use client";

import type { WidgetEditorProps } from "../types";
import { Field, TextField } from "../editor-kit";
import type { ReactionsConfig } from "./schema";

// Web editor for the reactions bar: the title plus the list of offered emojis
// (1–8). Emojis are edited as a compact chip row; the mobile admin mirrors this.
export default function ReactionsEditor({ config, onChange }: WidgetEditorProps<ReactionsConfig>) {
  const emojis = config.emojis;
  const setAt = (i: number, value: string) =>
    onChange({ ...config, emojis: emojis.map((e, idx) => (idx === i ? value : e)) });
  const removeAt = (i: number) => onChange({ ...config, emojis: emojis.filter((_, idx) => idx !== i) });
  const add = () => onChange({ ...config, emojis: [...emojis, "✨"] });

  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <Field label="Emojis proposés (1 à 8)">
        <div className="ed-emoji-row">
          {emojis.map((emoji, i) => (
            <div className="ed-emoji" key={i}>
              <input
                className="ed-input ed-emoji__input"
                value={emoji}
                maxLength={8}
                onChange={(e) => setAt(i, e.target.value)}
                aria-label={`Emoji ${i + 1}`}
              />
              <button
                type="button"
                className="ed-emoji__remove"
                aria-label="Retirer cet emoji"
                disabled={emojis.length <= 1}
                onClick={() => removeAt(i)}
              >
                ✕
              </button>
            </div>
          ))}
          {emojis.length < 8 && (
            <button type="button" className="ed-emoji__add" onClick={add} aria-label="Ajouter un emoji">
              +
            </button>
          )}
        </div>
      </Field>
    </>
  );
}
