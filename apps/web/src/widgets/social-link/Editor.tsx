"use client";

import type { WidgetEditorProps } from "../types";
import { SelectField, TextField } from "../editor-kit";
import { SOCIAL_PLATFORMS, type SocialLinkConfig } from "./schema";

const options = SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p }));

export default function SocialLinkEditor({ config, onChange }: WidgetEditorProps<SocialLinkConfig>) {
  return (
    <>
      <SelectField
        label="Plateforme"
        value={config.platform}
        options={options}
        onChange={(platform) => onChange({ ...config, platform })}
      />
      <TextField label="URL" value={config.url} onChange={(url) => onChange({ ...config, url })} placeholder="https://…" />
      <TextField
        label="Identifiant"
        value={config.handle ?? ""}
        onChange={(handle) => onChange({ ...config, handle })}
        placeholder="@pseudo"
      />
      <TextField
        label="Libellé (optionnel)"
        value={config.label ?? ""}
        onChange={(label) => onChange({ ...config, label: label || undefined })}
      />
    </>
  );
}
