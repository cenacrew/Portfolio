"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { GuestbookConfig } from "./schema";

// The live messages come from the DB and are moderated separately (admin
// guestbook panel). Only the widget's framing text is edited here.
export default function GuestbookEditor({ config, onChange }: WidgetEditorProps<GuestbookConfig>) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField
        label="Invitation"
        value={config.prompt}
        onChange={(prompt) => onChange({ ...config, prompt })}
        hint="Placeholder du champ de saisie."
      />
    </>
  );
}
