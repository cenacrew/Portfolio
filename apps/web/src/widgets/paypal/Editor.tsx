"use client";

import type { WidgetEditorProps } from "../types";
import { TextField } from "../editor-kit";
import type { PaypalConfig } from "./schema";

export default function PaypalEditor({ config, onChange }: WidgetEditorProps<PaypalConfig>) {
  return (
    <>
      <TextField
        label="Identifiant paypal.me"
        value={config.handle}
        onChange={(handle) => onChange({ ...config, handle })}
        placeholder="valentinargent"
        hint="La partie après paypal.me/"
      />
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Sous-titre" value={config.subtitle} onChange={(subtitle) => onChange({ ...config, subtitle })} />
    </>
  );
}
