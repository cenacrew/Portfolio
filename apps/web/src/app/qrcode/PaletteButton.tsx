"use client";

import { useState } from "react";

// "Paint" button next to the theme toggle. Generates a fresh accessible colour
// pair fully client-side with the `randoma11y` package (APCA contrast model,
// threshold 60 — the user's explicit choice) and applies it to the board's
// --c1 / --c2 base variables. Everything else is derived from them, and dark
// mode is just the inversion of the current pair. It is instant (no network)
// and BOTH colours vary. Nothing is persisted: a reload returns to cream + navy.
//
// The generator is dynamically imported so it stays out of the initial bundle
// and only loads on first tap.

// Relative luminance (sRGB) — used to decide which colour is paper (lighter →
// --c1) and which is ink (darker → --c2), so light mode always reads correctly.
function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export default function PaletteButton() {
  const [busy, setBusy] = useState(false);

  async function shuffle() {
    if (busy) return;
    setBusy(true);
    try {
      const { randoma11y } = await import("randoma11y");
      const { colors } = randoma11y({ algorithm: "APCA", threshold: 60 });
      const [a, b] = colors;
      // Lighter colour = paper (--c1), darker = ink (--c2).
      const [c1, c2] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
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
