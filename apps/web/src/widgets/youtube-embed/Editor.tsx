"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { YoutubeEmbedConfig } from "./schema";

export default function YoutubeEmbedEditor({ config, onChange }: WidgetEditorProps<YoutubeEmbedConfig>) {
  return (
    <>
      <TextField
        label="URL de la vidéo"
        value={config.url}
        onChange={(url) => onChange({ ...config, url })}
        placeholder="https://youtube.com/watch?v=…"
      />
      <TextField
        label="Titre (optionnel)"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title: title || undefined })}
      />
    </>
  );
}
