"use client";

import type { WidgetEditorProps } from "../types";
import { SelectField, TextArea, TextField } from "../editor-kit";
import type { NoteConfig } from "./schema";

const tones = [
  { value: "cream", label: "Crème" },
  { value: "blue", label: "Bleu" },
  { value: "amber", label: "Ambre" },
  { value: "rose", label: "Rose" },
] as const;

export default function NoteEditor({ config, onChange }: WidgetEditorProps<NoteConfig>) {
  return (
    <>
      <TextArea
        label="Texte"
        value={config.text}
        onChange={(text) => onChange({ ...config, text })}
        rows={4}
        hint="Markdown léger : **gras**, *italique*."
      />
      <SelectField label="Couleur" value={config.tone} options={tones} onChange={(tone) => onChange({ ...config, tone })} />
      <TextField
        label="Signature (optionnel)"
        value={config.signature ?? ""}
        onChange={(signature) => onChange({ ...config, signature: signature || undefined })}
      />
    </>
  );
}
