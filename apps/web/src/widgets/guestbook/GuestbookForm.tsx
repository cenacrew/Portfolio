"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Anonymous submit -> /api/guestbook (validated + rate-limited server-side).
// On success we refresh so the new message appears from the DB.
export default function GuestbookForm({ prompt }: { prompt: string }) {
  const router = useRouter();
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim() || undefined, message: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible.");
      setAuthor("");
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="w-guest__form" onSubmit={submit}>
      {error && <span className="w-guest__error">{error}</span>}
      <input
        className="w-input w-guest__name"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Ton nom"
        maxLength={40}
        aria-label="Ton nom"
      />
      <div className="w-guest__send">
        <input
          className="w-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={prompt}
          maxLength={280}
          aria-label="Ton message"
        />
        <button className="w-btn w-btn--icon" type="submit" disabled={busy} aria-label="Publier">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
