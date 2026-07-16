"use client";

import { useEffect, useRef, useState } from "react";
import { canAddCustomReaction, customReactionEmojis, isSingleEmoji } from "@portfolio/shared";
import { useRealtimeTable } from "../ui/useRealtimeTable";

// Client reaction bar (phase 19). A visitor has ONE active reaction per emoji:
// tapping toggles it (like/unlike), tracked locally in localStorage for instant
// UI and enforced server-side by a salted IP+UA hash. Counts reconcile to the
// server total and move live for every visitor through widget_reactions
// Realtime. A "+" control lets a visitor add a new emoji (strictly one grapheme,
// validated on both sides) that then appears for everyone. Moderation removing
// an emoji drops it here in Realtime too. Degrades gracefully when Supabase /
// the migration isn't there: taps still animate and roll back on failure.
export default function ReactionsBar({
  widgetId,
  title,
  emojis,
  configEmojis,
  initialCounts,
}: {
  widgetId: string;
  title: string;
  emojis: string[];
  configEmojis: string[];
  initialCounts: Record<string, number>;
}) {
  const [order, setOrder] = useState<string[]>(emojis);
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [popped, setPopped] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const storageKey = `qr-react:${widgetId}`;

  // Restore which emojis this visitor has reacted with (client optimistic
  // state; the server hash is the real guard). Runs after mount so SSR/hydration
  // never touch localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      // Restore after mount (client-only) to avoid an SSR/CSR hydration
      // mismatch; setState-in-effect is the correct idiom here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setActive(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* private mode / bad JSON: start with no active reactions */
    }
  }, [storageKey]);

  const persistActive = (next: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      /* best-effort */
    }
  };

  // Realtime: reflect counter changes AND emojis added/removed by anyone.
  useRealtimeTable(`reactions-${widgetId}`, "widget_reactions", `widget_id=eq.${widgetId}`, (payload) => {
    if (payload.eventType === "DELETE") {
      const old = payload.old as { emoji?: string };
      if (!old?.emoji) return;
      const gone = old.emoji;
      setOrder((o) => o.filter((e) => e !== gone));
      setCounts((c) => {
        const next = { ...c };
        delete next[gone];
        return next;
      });
      setActive((a) => {
        if (!a.has(gone)) return a;
        const next = new Set(a);
        next.delete(gone);
        persistActive(next);
        return next;
      });
      return;
    }
    const row = payload.new as { emoji?: string; count?: number };
    if (!row?.emoji || typeof row.count !== "number") return;
    const { emoji, count } = row;
    setOrder((o) => (o.includes(emoji) ? o : [...o, emoji]));
    setCounts((c) => ({ ...c, [emoji]: count }));
  });

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function pop(emoji: string) {
    setPopped(null);
    requestAnimationFrame(() => setPopped(emoji));
    if (popTimer.current) clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopped(null), 420);
  }

  async function react(emoji: string) {
    const wasActive = active.has(emoji);
    pop(emoji);

    // Optimistic toggle; Realtime + the server response reconcile the true total.
    const nextActive = new Set(active);
    if (wasActive) nextActive.delete(emoji);
    else nextActive.add(emoji);
    setActive(nextActive);
    persistActive(nextActive);
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (wasActive ? -1 : 1)) }));

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId, emoji }),
      });
      if (!res.ok) throw new Error("react failed");
      const json = (await res.json()) as { count?: number; active?: boolean };
      if (typeof json.count === "number") setCounts((c) => ({ ...c, [emoji]: json.count! }));
      if (typeof json.active === "boolean") {
        setActive((a) => {
          const sync = new Set(a);
          if (json.active) sync.add(emoji);
          else sync.delete(emoji);
          persistActive(sync);
          return sync;
        });
      }
    } catch {
      // Roll the optimistic toggle back on a hard failure.
      setActive((a) => {
        const back = new Set(a);
        if (wasActive) back.add(emoji);
        else back.delete(emoji);
        persistActive(back);
        return back;
      });
      setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (wasActive ? 1 : -1)) }));
    }
  }

  const canAddMore = customReactionEmojis(order, configEmojis).length < 8;

  async function submitCustom() {
    const emoji = draft.trim();
    if (!isSingleEmoji(emoji)) {
      setHint("Un seul emoji, s'il te plaît.");
      return;
    }
    if (order.includes(emoji)) {
      setHint("Déjà dans la liste.");
      return;
    }
    if (!canAddCustomReaction(order, configEmojis, emoji)) {
      setHint("Trop d'emojis déjà.");
      return;
    }
    setHint(null);
    setDraft("");
    setAdding(false);
    // Show it right away; Realtime confirms it for everyone.
    setOrder((o) => (o.includes(emoji) ? o : [...o, emoji]));
    setCounts((c) => ({ ...c, [emoji]: c[emoji] ?? 0 }));
    try {
      const res = await fetch("/api/reactions/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId, emoji }),
      });
      if (!res.ok) throw new Error("add failed");
      // The visitor who added it reacts with it straight away.
      await react(emoji);
    } catch {
      // Roll the optimistic emoji back if the add didn't take.
      setOrder((o) => o.filter((e) => e !== emoji));
      setCounts((c) => {
        const next = { ...c };
        if (!initialCounts[emoji]) delete next[emoji];
        return next;
      });
    }
  }

  return (
    <div className="w-react">
      <span className="w-eyebrow">{title}</span>
      <ul className="w-react__list">
        {order.map((emoji) => (
          <li key={emoji}>
            <button
              type="button"
              className={`w-react__btn${popped === emoji ? " is-pop" : ""}${active.has(emoji) ? " is-active" : ""}`}
              onClick={() => react(emoji)}
              aria-pressed={active.has(emoji)}
              aria-label={`Réagir avec ${emoji}`}
            >
              <span className="w-react__emoji" aria-hidden>
                {emoji}
              </span>
              <span className="w-react__count">{counts[emoji] ?? 0}</span>
            </button>
          </li>
        ))}

        {adding ? (
          <li className="w-react__add-form">
            <input
              ref={inputRef}
              className="w-react__add-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (hint) setHint(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCustom();
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                  setHint(null);
                }
              }}
              maxLength={8}
              inputMode="text"
              placeholder="🙂"
              aria-label="Ajouter un emoji"
            />
            <button
              type="button"
              className="w-react__add-ok"
              onClick={submitCustom}
              aria-label="Valider l'emoji"
            >
              OK
            </button>
          </li>
        ) : canAddMore ? (
          <li>
            <button
              type="button"
              className="w-react__btn w-react__add"
              onClick={() => setAdding(true)}
              aria-label="Ajouter un emoji"
            >
              <span className="w-react__emoji" aria-hidden>
                +
              </span>
            </button>
          </li>
        ) : null}
      </ul>
      {hint ? (
        <span className="w-react__hint" role="status">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
