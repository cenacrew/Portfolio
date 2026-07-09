"use client";

import type { WidgetEditorProps } from "../types";
import { TextArea, TextField } from "../editor-kit";
import type { FreeLinkConfig } from "./schema";

export default function FreeLinkEditor({ config, onChange }: WidgetEditorProps<FreeLinkConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="URL" value={config.url} onChange={(url) => onChange({ ...config, url })} placeholder="https://…" />
      <TextArea
        label="Description (optionnel)"
        value={config.description ?? ""}
        onChange={(description) => onChange({ ...config, description: description || undefined })}
        rows={2}
      />
      <div className="ed-row2">
        <TextField
          label="Emoji"
          value={config.emoji ?? ""}
          onChange={(emoji) => onChange({ ...config, emoji: emoji || undefined })}
          maxLength={4}
        />
        <TextField
          label="Accent CSS"
          value={config.accent ?? ""}
          onChange={(accent) => onChange({ ...config, accent: accent || undefined })}
          placeholder="linear-gradient(…)"
        />
      </div>
      <TextField
        label="Image (URL, optionnel)"
        value={config.image ?? ""}
        onChange={(image) => onChange({ ...config, image: image || undefined })}
      />
    </>
  );
}
