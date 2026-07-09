"use client";

import type { WidgetEditorProps } from "../types";
import { ListEditor, NumberField, SelectField, TextField } from "../editor-kit";
import type { WatchlistConfig, WatchlistItem } from "./schema";

const statuses = [
  { value: "watching", label: "En cours" },
  { value: "done", label: "Terminé" },
  { value: "plan", label: "À voir" },
] as const;

export default function WatchlistEditor({ config, onChange }: WidgetEditorProps<WatchlistConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <ListEditor<WatchlistItem>
        label="Titres"
        items={config.items}
        min={1}
        addLabel="un titre"
        makeItem={() => ({ title: "", status: "watching" })}
        onChange={(items) => onChange({ ...config, items })}
        renderItem={(item, update) => (
          <>
            <TextField label="Titre" value={item.title} onChange={(title) => update({ title })} />
            <SelectField label="Statut" value={item.status} options={statuses} onChange={(status) => update({ status })} />
            <div className="ed-row2">
              <NumberField
                label="Épisode actuel"
                value={item.current ?? 0}
                min={0}
                onChange={(current) => update({ current })}
              />
              <NumberField label="Total" value={item.total ?? 0} min={0} onChange={(total) => update({ total: total || undefined })} />
            </div>
            <TextField
              label="Affiche (URL, optionnel)"
              value={item.poster ?? ""}
              onChange={(poster) => update({ poster: poster || undefined })}
            />
            <TextField
              label="Couleur d’accent (optionnel)"
              value={item.accent ?? ""}
              onChange={(accent) => update({ accent: accent || undefined })}
              placeholder="#3b2a63"
            />
          </>
        )}
      />
    </>
  );
}
