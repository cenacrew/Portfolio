"use client";

import { useState } from "react";
import { buildVCard, vcardFileStem } from "@portfolio/shared";
import type { ContactCardConfig } from "./schema";

// Triggers a browser download of the given bytes as a .vcf file.
function downloadVcf(text: string, stem: string) {
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has claimed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "Add to contacts" button. Prefers the server-generated vCard (proper escaping
// + embedded photo) at /api/contact-card; falls back to a photo-less vCard built
// from the config it already holds when the server can't be reached (offline /
// QA console) so the tile always downloads a valid card.
export default function AddToContacts({
  widgetId,
  config,
}: {
  widgetId: string;
  config: ContactCardConfig;
}) {
  const [busy, setBusy] = useState(false);
  const stem = vcardFileStem(config);

  async function fallback() {
    downloadVcf(
      buildVCard({
        firstName: config.firstName,
        lastName: config.lastName,
        role: config.role,
        org: config.org,
        phone: config.phone,
        email: config.email,
        website: config.website,
      }),
      stem,
    );
  }

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contact-card?widgetId=${encodeURIComponent(widgetId)}`);
      if (!res.ok) throw new Error("server unavailable");
      const text = await res.text();
      downloadVcf(text, stem);
    } catch {
      await fallback();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="w-vcard__add" onClick={add} disabled={busy} aria-busy={busy}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 11h6M19 8v6" />
        <circle cx="9" cy="8" r="3.4" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      </svg>
      <span>Ajouter à mes contacts</span>
    </button>
  );
}
