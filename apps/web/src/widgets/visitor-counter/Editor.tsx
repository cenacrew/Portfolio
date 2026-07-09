"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { VisitorCounterConfig } from "./schema";

// The live count comes from the visits RPC; only the label is editable.
export default function VisitorCounterEditor({ config, onChange }: WidgetEditorProps<VisitorCounterConfig>) {
  return (
    <TextField
      label="Libellé"
      value={config.label}
      onChange={(label) => onChange({ ...config, label })}
      hint="Le nombre est compté automatiquement côté serveur."
    />
  );
}
