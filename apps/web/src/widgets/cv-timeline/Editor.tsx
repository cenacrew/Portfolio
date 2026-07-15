"use client";

import { makeCvTimelineEntry } from "@portfolio/shared";
import type { WidgetEditorProps } from "../types";
import { ListEditor, TextField } from "../editor-kit";
import type { CvTimelineConfig, CvTimelineEntry } from "./schema";

// Web editor for the CV timeline. The mobile admin adds a native reorder handle;
// here the list keeps add / remove and edits each entry's fields. Entries render
// newest-first in the order they appear.
export default function CvTimelineEditor({ config, onChange }: WidgetEditorProps<CvTimelineConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <ListEditor<CvTimelineEntry>
        label="Entrées (de la plus récente à la plus ancienne)"
        items={config.entries}
        addLabel="Entrée"
        makeItem={makeCvTimelineEntry}
        onChange={(entries) => onChange({ ...config, entries })}
        renderItem={(item, update) => (
          <>
            <TextField label="Période" value={item.period} onChange={(period) => update({ period })} placeholder="2023 — aujourd'hui" />
            <TextField label="Intitulé" value={item.title} onChange={(title) => update({ title })} placeholder="Développeur produit" />
            <TextField label="Lieu" value={item.place} onChange={(place) => update({ place })} placeholder="Entreprise / ville" />
            <TextField
              label="Logo (URL)"
              value={item.logoUrl ?? ""}
              onChange={(logoUrl) => update({ logoUrl: logoUrl || undefined })}
              placeholder="Optionnel"
            />
            <TextField
              label="Description"
              value={item.description ?? ""}
              onChange={(description) => update({ description: description || undefined })}
              placeholder="Optionnel — une ligne"
            />
          </>
        )}
      />
    </>
  );
}
