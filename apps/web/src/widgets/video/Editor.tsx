"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { VideoConfig } from "./schema";

// Minimal web editor. The rich upload flow (pick a clip from the phone) lives in
// the mobile admin; here we just expose the fields so the type is complete.
export default function VideoEditor({ config, onChange }: WidgetEditorProps<VideoConfig>) {
  return (
    <>
      <TextField
        label="Source vidéo"
        value={config.src}
        onChange={(src) => onChange({ ...config, src })}
        placeholder="URL .mp4 (bucket widget-media)"
      />
      <TextField
        label="Image d’aperçu"
        value={config.poster ?? ""}
        onChange={(poster) => onChange({ ...config, poster: poster || undefined })}
        placeholder="URL d’une image (optionnel)"
      />
      <TextField
        label="Légende"
        value={config.caption ?? ""}
        onChange={(caption) => onChange({ ...config, caption: caption || undefined })}
      />
    </>
  );
}
