"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { LetterboxdConfig } from "./schema";

export default function LetterboxdEditor({ config, onChange }: WidgetEditorProps<LetterboxdConfig>) {
  return (
    <TextField
      label="Nom d'utilisateur Letterboxd"
      value={config.username}
      onChange={(username) => onChange({ ...config, username })}
      placeholder="cenacrew"
      hint="Le flux public letterboxd.com/<pseudo>/rss/ alimente le widget."
    />
  );
}
