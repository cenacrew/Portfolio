"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { SpotifyEmbedConfig } from "./schema";

export default function SpotifyEmbedEditor({ config, onChange }: WidgetEditorProps<SpotifyEmbedConfig>) {
  return (
    <>
      <TextField
        label="URL Spotify"
        value={config.url}
        onChange={(url) => onChange({ ...config, url })}
        hint="Lien open.spotify.com (playlist, album, titre ou artiste)."
      />
      <TextField
        label="Titre (optionnel)"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title: title || undefined })}
      />
    </>
  );
}
