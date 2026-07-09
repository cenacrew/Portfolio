"use client";

import type { WidgetEditorProps } from "../types";
import { TextArea, TextField } from "../editor-kit";
import type { StatusConfig } from "./schema";

export default function StatusEditor({ config, onChange }: WidgetEditorProps<StatusConfig>) {
  return (
    <>
      <TextField
        label="Emoji"
        value={config.emoji}
        onChange={(emoji) => onChange({ ...config, emoji })}
        maxLength={4}
      />
      <TextArea label="Statut" value={config.text} onChange={(text) => onChange({ ...config, text })} rows={2} />
      <TextField
        label="Mention (optionnel)"
        value={config.updated ?? ""}
        onChange={(updated) => onChange({ ...config, updated: updated || undefined })}
        placeholder="Mis à jour aujourd’hui"
      />
    </>
  );
}
