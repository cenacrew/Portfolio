"use client";

import { useState } from "react";

// "Paint" button next to the theme toggle. Pulls a fresh accessible colour pair
// from randoma11y (via our /api/palette proxy) and applies it to the board's
// --c1 / --c2 base variables — everything else is derived from them, and dark
// mode is just the inversion of the current pair. Nothing is persisted: a reload
// returns to the default cream + navy. Network failures are swallowed silently
// (the button simply retries on the next tap).
export default function PaletteButton() {
  const [busy, setBusy] = useState(false);

  async function shuffle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/palette", { cache: "no-store" });
      if (!res.ok) return;
      const { c1, c2 } = (await res.json()) as { c1?: string; c2?: string };
      if (!c1 || !c2) return;
      const page = document.querySelector<HTMLElement>(".qr-page");
      if (!page) return;
      page.style.setProperty("--c1", c1);
      page.style.setProperty("--c2", c2);
    } catch {
      // Silent: keep the current colours, no error surfaced to the visitor.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="qr-theme qr-palette"
      onClick={shuffle}
      aria-label="Changer la palette de couleurs"
      title="Nouvelle palette"
      data-busy={busy || undefined}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
        <path
          d="M12 3a9 9 0 1 0 0 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.8.7-1.5 1.5-1.5H15a5 5 0 0 0 5-5c0-4.4-3.6-7.8-8-7.8z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="11" r="1.1" fill="currentColor" />
        <circle cx="10" cy="7.5" r="1.1" fill="currentColor" />
        <circle cx="14.5" cy="7.5" r="1.1" fill="currentColor" />
        <circle cx="17" cy="11" r="1.1" fill="currentColor" />
      </svg>
    </button>
  );
}
