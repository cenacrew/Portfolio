"use client";

import type { WidgetEditorProps } from "../types";
import { ListEditor, TextField } from "../editor-kit";
import type { PollConfig } from "./schema";

type Option = PollConfig["options"][number];

// Votes live in the poll_votes table; here you edit the question and options.
// Option `id` is the value stored per vote — changing it resets that option's
// tally, so it's shown read-only-ish via a slug field.
export default function PollEditor({ config, onChange }: WidgetEditorProps<PollConfig>) {
  return (
    <>
      <TextField label="Question" value={config.question} onChange={(question) => onChange({ ...config, question })} />
      <ListEditor<Option>
        label="Options"
        items={config.options}
        min={2}
        addLabel="une option"
        makeItem={() => ({ id: `opt-${Math.random().toString(36).slice(2, 7)}`, label: "", votes: 0 })}
        onChange={(options) => onChange({ ...config, options })}
        renderItem={(item, update) => (
          <>
            <TextField label="Texte" value={item.label} onChange={(label) => update({ label })} />
            <TextField
              label="Identifiant"
              value={item.id}
              onChange={(id) => update({ id })}
              hint="Clé stable du vote — évite de la changer après publication."
            />
          </>
        )}
      />
    </>
  );
}
