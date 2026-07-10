"use client";

import { useState } from "react";
import GreatModal from "../ui/GreatModal";
import GuestbookForm from "./GuestbookForm";
import type { GuestbookMessage } from "./schema";

// Phase 4.10 A6: the tile is a compact preview (as many words as fit + an
// "add a word" affordance); tapping opens the shared large modal with the full
// list and the form. Works at every format via container queries in qrcode.css.
export default function GuestbookBoard({
  title,
  prompt,
  messages,
}: {
  title: string;
  prompt: string;
  messages: GuestbookMessage[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="w-guest" onClick={() => setOpen(true)} aria-label={`${title} — voir et ajouter un mot`}>
        <div className="w-guest__head">
          <span className="w-eyebrow">{title}</span>
          <span className="w-guest__count">{messages.length}</span>
        </div>

        <ul className="w-guest__list w-guest__list--preview">
          {messages.map((m, i) => (
            <li key={i} className="w-guest__msg">
              <p className="w-guest__body">{m.message}</p>
              <span className="w-guest__author">{m.author}</span>
            </li>
          ))}
          {messages.length === 0 && <li className="w-guest__empty">Sois le premier à écrire.</li>}
        </ul>

        <span className="w-guest__add" aria-hidden>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Ajouter un mot
        </span>
      </button>

      {open && (
        <GreatModal title={title} onClose={() => setOpen(false)} className="gmodal--guest">
          <div className="guest-modal">
            <ul className="guest-modal__list">
              {messages.map((m, i) => (
                <li key={i} className="w-guest__msg">
                  <p className="w-guest__body">{m.message}</p>
                  <span className="w-guest__author">{m.author}</span>
                </li>
              ))}
              {messages.length === 0 && <li className="w-guest__empty">Sois le premier à écrire.</li>}
            </ul>
            <div className="guest-modal__form">
              <GuestbookForm prompt={prompt} />
            </div>
          </div>
        </GreatModal>
      )}
    </>
  );
}
