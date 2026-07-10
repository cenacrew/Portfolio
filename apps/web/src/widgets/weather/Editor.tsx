"use client";

import type { WidgetEditorProps } from "../types";
import { NumberField, TextField, ToggleField } from "../editor-kit";
import type { WeatherConfig } from "./schema";

export default function WeatherEditor({ config, onChange }: WidgetEditorProps<WeatherConfig>) {
  return (
    <>
      <ToggleField
        label="Suivre ma présence"
        hint="Utilise la localisation de l'app (comme « Ma loc »). Désactive pour une ville fixe."
        value={config.followPresence}
        onChange={(followPresence) => onChange({ ...config, followPresence })}
      />
      {!config.followPresence && (
        <>
          <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
          <div className="ed-row2">
            <NumberField label="Latitude" value={config.lat} step={0.0001} onChange={(lat) => onChange({ ...config, lat })} />
            <NumberField label="Longitude" value={config.lng} step={0.0001} onChange={(lng) => onChange({ ...config, lng })} />
          </div>
        </>
      )}
    </>
  );
}
