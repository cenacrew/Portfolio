"use client";

import type { WidgetEditorProps } from "../types";
import { NumberField, TextField } from "../editor-kit";
import type { LocationMapConfig } from "./schema";

export default function LocationMapEditor({ config, onChange }: WidgetEditorProps<LocationMapConfig>) {
  return (
    <>
      <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
      <div className="ed-row2">
        <NumberField label="Latitude" value={config.lat} step={0.0001} onChange={(lat) => onChange({ ...config, lat })} />
        <NumberField label="Longitude" value={config.lng} step={0.0001} onChange={(lng) => onChange({ ...config, lng })} />
      </div>
      <NumberField label="Zoom" value={config.zoom} min={1} max={19} onChange={(zoom) => onChange({ ...config, zoom })} />
      <TextField
        label="Légende (optionnel)"
        value={config.caption ?? ""}
        onChange={(caption) => onChange({ ...config, caption: caption || undefined })}
      />
    </>
  );
}
