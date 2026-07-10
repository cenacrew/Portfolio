"use client";

import type { WidgetEditorProps } from "../types";
import { SelectField, TextField } from "../editor-kit";
import { LOL_MODE_LABELS, type LolConfig, type LolMode } from "./schema";

const MODE_OPTIONS: { value: LolMode; label: string }[] = (
  Object.keys(LOL_MODE_LABELS) as LolMode[]
).map((value) => ({ value, label: LOL_MODE_LABELS[value] }));

export default function LolEditor({ config, onChange }: WidgetEditorProps<LolConfig>) {
  return (
    <>
      <TextField
        label="Riot ID"
        value={config.riotId}
        onChange={(riotId) => onChange({ ...config, riotId })}
        placeholder="cenacrew#EUW"
        hint="Format pseudo#tag. Compte EUW. Le PUUID est résolu côté serveur."
      />
      <SelectField
        label="Affichage"
        value={config.mode}
        options={MODE_OPTIONS}
        onChange={(mode) => onChange({ ...config, mode })}
        hint="Le mode ARAM arrive bientôt (donnée Riot non exploitable pour l'instant)."
      />
    </>
  );
}
