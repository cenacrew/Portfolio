"use client";

import { formatFileSize } from "@portfolio/shared";
import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { FileDownloadConfig } from "./schema";

// Minimal web editor. The rich upload flow (pick a file from the phone) lives in
// the mobile admin; here we expose the fields so the type is complete and an
// admin can paste a URL or tweak the label/description.
export default function FileDownloadEditor({ config, onChange }: WidgetEditorProps<FileDownloadConfig>) {
  const size = formatFileSize(config.sizeBytes);
  return (
    <>
      <TextField
        label="URL du fichier"
        value={config.fileUrl}
        onChange={(fileUrl) => onChange({ ...config, fileUrl })}
        placeholder="URL publique (bucket widget-media)"
      />
      <TextField
        label="Nom du fichier"
        value={config.fileName}
        onChange={(fileName) => onChange({ ...config, fileName })}
        placeholder="rapport.pdf"
        hint={size ? `Taille : ${size}` : undefined}
      />
      <TextField
        label="Titre affiché"
        value={config.label ?? ""}
        onChange={(label) => onChange({ ...config, label: label || undefined })}
        placeholder="Optionnel — remplace le nom du fichier"
      />
      <TextField
        label="Description"
        value={config.description ?? ""}
        onChange={(description) => onChange({ ...config, description: description || undefined })}
        placeholder="Optionnel — une ligne"
      />
    </>
  );
}
