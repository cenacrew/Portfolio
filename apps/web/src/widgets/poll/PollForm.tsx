"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: string; label: string };

// Client vote UI. Optimistically reflects the vote, then POSTs to
// /api/poll/vote (server enforces one vote per visitor by IP+UA hash).
export default function PollForm({
  widgetId,
  question,
  options,
  initialCounts,
  initialVoted,
}: {
  widgetId: string;
  question: string;
  options: Opt[];
  initialCounts: Record<string, number>;
  initialVoted: string | null;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [voted, setVoted] = useState<string | null>(initialVoted);
  const [busy, setBusy] = useState(false);

  async function vote(id: string) {
    // Phase 4.8 B8: a visitor can change their vote. Tapping the current choice
    // is a no-op; tapping another moves the vote across.
    if (busy || voted === id) return;
    setBusy(true);
    const previous = voted;
    // Optimistic: move the vote (decrement the old option, increment the new).
    setVoted(id);
    setCounts((c) => {
      const next = { ...c, [id]: (c[id] ?? 0) + 1 };
      if (previous) next[previous] = Math.max(0, (next[previous] ?? 1) - 1);
      return next;
    });
    try {
      const res = await fetch("/api/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId, option: id }),
      });
      if (!res.ok) throw new Error("vote failed");
      router.refresh();
    } catch {
      // Revert the optimistic move on hard failure.
      setVoted(previous);
      setCounts((c) => {
        const next = { ...c, [id]: Math.max(0, (c[id] ?? 1) - 1) };
        if (previous) next[previous] = (next[previous] ?? 0) + 1;
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="w-poll">
      <p className="w-poll__q">{question}</p>
      <ul className="w-poll__opts">
        {options.map((o) => {
          const pct = Math.round(((counts[o.id] ?? 0) / total) * 100);
          const mine = voted === o.id;
          return (
            <li key={o.id}>
              <button
                className={`w-poll__opt${voted ? " is-revealed" : ""}${mine ? " is-mine" : ""}`}
                onClick={() => vote(o.id)}
                disabled={busy}
              >
                <span className="w-poll__fill" style={{ width: voted ? `${pct}%` : "0%" }} />
                <span className="w-poll__label">{o.label}</span>
                {voted && <span className="w-poll__pct">{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <span className="w-poll__total">
        {voted
          ? `${Object.values(counts).reduce((a, b) => a + b, 0)} vote${total > 1 ? "s" : ""}`
          : "Vote pour voir les résultats"}
      </span>
    </div>
  );
}
