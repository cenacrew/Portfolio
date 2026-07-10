"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { ToileConfig } from "./schema";

export default function ToileEditor({ config, onChange }: WidgetEditorProps<ToileConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Sous-titre" value={config.subtitle} onChange={(subtitle) => onChange({ ...config, subtitle })} />
    </>
  );
}
