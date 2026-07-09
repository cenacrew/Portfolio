"use client";

import type { WidgetEditorProps } from "../types";
import { NumberField, TextField } from "../editor-kit";
import type { GithubStatsConfig } from "./schema";

export default function GithubStatsEditor({ config, onChange }: WidgetEditorProps<GithubStatsConfig>) {
  return (
    <>
      <TextField
        label="Utilisateur GitHub"
        value={config.username}
        onChange={(username) => onChange({ ...config, username })}
      />
      <NumberField
        label="Semaines affichées"
        value={config.weeks}
        min={4}
        max={16}
        onChange={(weeks) => onChange({ ...config, weeks })}
      />
    </>
  );
}
