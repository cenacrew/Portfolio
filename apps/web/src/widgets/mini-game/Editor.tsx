"use client";

import { GAME_KEYS, GAME_LABELS } from "@portfolio/shared";
import type { WidgetEditorProps } from "../types";
import { SelectField, TextField } from "../editor-kit";
import type { MiniGameConfig } from "./schema";

// Web editor: pick the game (Snake / Flappy) and an optional marquee title.
// Two mini-game tiles can coexist (one per game) on the same board.
export default function MiniGameEditor({ config, onChange }: WidgetEditorProps<MiniGameConfig>) {
  return (
    <>
      <SelectField
        label="Jeu"
        value={config.game}
        options={GAME_KEYS.map((g) => ({ value: g, label: GAME_LABELS[g] }))}
        onChange={(game) => onChange({ ...config, game })}
      />
      <TextField
        label="Titre (optionnel)"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title: title || undefined })}
        hint="Par défaut, le nom du jeu est affiché."
        maxLength={40}
      />
    </>
  );
}
