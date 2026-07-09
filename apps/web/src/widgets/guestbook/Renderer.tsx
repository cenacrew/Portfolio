"use client";

import { useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { GuestbookConfig, GuestbookMessage } from "./schema";

// Phase 2: UI only, mock data. Submitting prepends locally to simulate the
// "direct publish" flow. Phase 3 wires this to a Supabase table + moderation.
export default function GuestbookRenderer({
  config,
}: WidgetRendererProps<GuestbookConfig>) {
  const [messages, setMessages] = useState<GuestbookMessage[]>(config.seed);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      {
        author: author.trim() || "Anonyme",
        message: trimmed,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setAuthor("");
    setMessage("");
  }

  return (
    <div className="w-guest">
      <div className="w-guest__head">
        <span className="w-eyebrow">{config.title}</span>
        <span className="w-guest__count">{messages.length}</span>
      </div>

      <ul className="w-guest__list">
        {messages.map((m, i) => (
          <li key={i} className="w-guest__msg">
            <p className="w-guest__body">{m.message}</p>
            <span className="w-guest__author">{m.author}</span>
          </li>
        ))}
        {messages.length === 0 && (
          <li className="w-guest__empty">Sois le premier à écrire.</li>
        )}
      </ul>

      <form className="w-guest__form" onSubmit={submit}>
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
            placeholder={config.prompt}
            maxLength={140}
            aria-label="Ton message"
          />
          <button className="w-btn w-btn--icon" type="submit" aria-label="Publier">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
