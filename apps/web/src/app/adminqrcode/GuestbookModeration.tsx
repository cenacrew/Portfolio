"use client";

import { useState } from "react";
import type { GuestbookRow } from "@portfolio/shared";
import { deleteMessageAction } from "./actions";

// Guestbook moderation list: read messages, delete unwanted ones.
export default function GuestbookModeration({
  messages,
  onClose,
}: {
  messages: GuestbookRow[];
  onClose: () => void;
}) {
  const [items, setItems] = useState(messages);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    try {
      await deleteMessageAction(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="admin-scrim" onClick={onClose} />
      <aside className="admin-drawer" role="dialog" aria-label="Modérer le livre d'or">
        <header className="admin-drawer__head">
          <div>
            <span className="admin-drawer__eyebrow">Livre d’or</span>
            <h2 className="admin-drawer__title">Modération</h2>
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="admin-drawer__body">
          {items.length === 0 && <p className="ed-note">Aucun message pour l’instant.</p>}
          <ul className="admin-mod">
            {items.map((m) => (
              <li key={m.id} className="admin-mod__row">
                <div className="admin-mod__content">
                  <p className="admin-mod__msg">{m.message}</p>
                  <span className="admin-mod__meta">
                    {m.author} · {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <button
                  className="admin-btn admin-btn--danger admin-btn--sm"
                  onClick={() => remove(m.id)}
                  disabled={busyId === m.id}
                >
                  {busyId === m.id ? "…" : "Supprimer"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
