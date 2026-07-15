"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Client reaction bar. Optimistically bumps the tapped emoji with a spring
// "pop", POSTs to /api/reactions (server runs the security-definer RPC), and
// subscribes to widget_reactions Realtime so counts from OTHER visitors move
// live. Degrades gracefully when Supabase / the table isn't available: the tap
// still animates, and a failed POST rolls its optimistic bump back.
export default function ReactionsBar({
  widgetId,
  title,
  emojis,
  initialCounts,
}: {
  widgetId: string;
  title: string;
  emojis: string[];
  initialCounts: Record<string, number>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [popped, setPopped] = useState<string | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime: adopt the authoritative count for any (widget, emoji) that
  // changes, so a second browser sees the counter move without a refresh.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`reactions-${widgetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "widget_reactions", filter: `widget_id=eq.${widgetId}` },
        (payload) => {
          const row = payload.new as { emoji?: string; count?: number };
          if (row?.emoji && typeof row.count === "number") {
            setCounts((c) => (c[row.emoji!] === undefined ? c : { ...c, [row.emoji!]: row.count! }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [widgetId]);

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  async function react(emoji: string) {
    // Pop the emoji (retrigger even on a repeat tap).
    setPopped(null);
    requestAnimationFrame(() => setPopped(emoji));
    if (popTimer.current) clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopped(null), 420);

    // Optimistic bump; Realtime will reconcile to the true total.
    setCounts((c) => ({ ...c, [emoji]: (c[emoji] ?? 0) + 1 }));
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId, emoji }),
      });
      if (!res.ok) throw new Error("react failed");
      const json = (await res.json()) as { count?: number };
      if (typeof json.count === "number") {
        setCounts((c) => ({ ...c, [emoji]: json.count! }));
      }
    } catch {
      // Roll the optimistic bump back on a hard failure.
      setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 1) - 1) }));
    }
  }

  return (
    <div className="w-react">
      <span className="w-eyebrow">{title}</span>
      <ul className="w-react__list">
        {emojis.map((emoji) => (
          <li key={emoji}>
            <button
              type="button"
              className={`w-react__btn${popped === emoji ? " is-pop" : ""}`}
              onClick={() => react(emoji)}
              aria-label={`Réagir avec ${emoji}`}
            >
              <span className="w-react__emoji" aria-hidden>
                {emoji}
              </span>
              <span className="w-react__count">{counts[emoji] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
