"use client";

import type { WidgetEditorProps } from "../types";
import { TextField, ToggleField } from "../editor-kit";
import type { ContactCardConfig } from "./schema";

// Web editor for the contact card. The mobile admin offers the same fields; the
// avatar reuse toggle swaps between the header avatar and a custom photo URL.
export default function ContactCardEditor({ config, onChange }: WidgetEditorProps<ContactCardConfig>) {
  return (
    <>
      <TextField label="Prénom" value={config.firstName} onChange={(firstName) => onChange({ ...config, firstName })} />
      <TextField label="Nom" value={config.lastName} onChange={(lastName) => onChange({ ...config, lastName })} />
      <TextField
        label="Rôle"
        value={config.role ?? ""}
        onChange={(role) => onChange({ ...config, role: role || undefined })}
        placeholder="Optionnel — ex. Développeur produit"
      />
      <TextField
        label="Organisation"
        value={config.org ?? ""}
        onChange={(org) => onChange({ ...config, org: org || undefined })}
        placeholder="Optionnel"
      />
      <TextField
        label="Téléphone"
        value={config.phone ?? ""}
        onChange={(phone) => onChange({ ...config, phone: phone || undefined })}
        placeholder="Optionnel — +33…"
      />
      <TextField
        label="Email"
        value={config.email ?? ""}
        onChange={(email) => onChange({ ...config, email: email || undefined })}
        placeholder="Optionnel"
      />
      <TextField
        label="Site web"
        value={config.website ?? ""}
        onChange={(website) => onChange({ ...config, website: website || undefined })}
        placeholder="Optionnel — https://…"
      />
      <ToggleField
        label="Utiliser l'avatar de l'en-tête"
        value={config.useHeaderAvatar}
        onChange={(useHeaderAvatar) => onChange({ ...config, useHeaderAvatar })}
        hint="La photo de la carte (et de la vCard) reprend l'avatar du dashboard."
      />
      {!config.useHeaderAvatar && (
        <TextField
          label="Photo (URL)"
          value={config.photoUrl ?? ""}
          onChange={(photoUrl) => onChange({ ...config, photoUrl: photoUrl || undefined })}
          placeholder="https://…"
        />
      )}
    </>
  );
}
