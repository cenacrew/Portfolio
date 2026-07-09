"use client";

import type { WidgetEditorProps } from "../types";
import { NumberField, TextField } from "../editor-kit";
import type { WeatherConfig } from "./schema";

export default function WeatherEditor({ config, onChange }: WidgetEditorProps<WeatherConfig>) {
  return (
    <>
      <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
      <div className="ed-row2">
        <NumberField label="Latitude" value={config.lat} step={0.0001} onChange={(lat) => onChange({ ...config, lat })} />
        <NumberField label="Longitude" value={config.lng} step={0.0001} onChange={(lng) => onChange({ ...config, lng })} />
      </div>
    </>
  );
}
