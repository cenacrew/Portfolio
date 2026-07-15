"use client";

import { useState } from "react";
import type { WidgetEditorProps } from "../types";
import { ListEditor, NumberField, TextField } from "../editor-kit";
import type { PhotoConfig } from "./schema";

type Img = PhotoConfig["images"][number];

function UploadButton({ onDone }: { onDone: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Échec de l’envoi");
      onDone(json.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l’envoi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ed-upload">
      <label className="ed-upload__btn">
        {busy ? "Envoi…" : "Importer une image"}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && <span className="ed-error">{error}</span>}
    </div>
  );
}

export default function PhotoEditor({ config, onChange }: WidgetEditorProps<PhotoConfig>) {
  return (
    <>
      <ListEditor<Img>
        label="Images"
        items={config.images}
        min={1}
        addLabel="une image"
        makeItem={() => ({ src: "", alt: "" })}
        onChange={(images) => onChange({ ...config, images })}
        renderItem={(item, update) => (
          <>
            <TextField label="Source" value={item.src} onChange={(src) => update({ src })} placeholder="/files/img/… ou URL" />
            <UploadButton onDone={(url) => update({ src: url })} />
            <TextField label="Texte alt" value={item.alt} onChange={(alt) => update({ alt })} />
            <TextField
              label="Légende"
              value={item.caption ?? ""}
              onChange={(caption) => update({ caption: caption || undefined })}
            />
            <TextField
              label="Lien au clic (optionnel)"
              value={item.linkUrl ?? ""}
              onChange={(linkUrl) => update({ linkUrl: linkUrl || undefined })}
              placeholder="https://…"
              hint="Un tap sur l’image ouvre ce lien dans un nouvel onglet."
            />
          </>
        )}
      />
      <NumberField
        label="Défilement auto (secondes)"
        value={config.intervalSec ?? 5}
        onChange={(intervalSec) => onChange({ ...config, intervalSec })}
        min={0}
        max={60}
        step={1}
        hint="Délai entre deux photos. 0 = pas de défilement automatique (navigation par les boutons)."
      />
    </>
  );
}
