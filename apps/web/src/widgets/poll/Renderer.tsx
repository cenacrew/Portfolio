"use client";

import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { PollConfig } from "./schema";

// Phase 2: votes are local (one per visitor, persisted in localStorage).
// Phase 3 moves them to a Supabase poll_votes table.
export default function PollRenderer({
  config,
  widget,
}: WidgetRendererProps<PollConfig>) {
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(config.options.map((o) => [o.id, o.votes])),
  );
  const [voted, setVoted] = useState<string | null>(null);
  const key = `qr-poll-${widget.id}`;

  useEffect(() => {
    const prev = localStorage.getItem(key);
    if (prev) setVoted(prev);
  }, [key]);

  function vote(id: string) {
    if (voted) return;
    setVotes((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
    setVoted(id);
    localStorage.setItem(key, id);
  }

  const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="w-poll">
      <p className="w-poll__q">{config.question}</p>
      <ul className="w-poll__opts">
        {config.options.map((o) => {
          const pct = Math.round((votes[o.id] / total) * 100);
          const mine = voted === o.id;
          return (
            <li key={o.id}>
              <button
                className={`w-poll__opt${voted ? " is-revealed" : ""}${mine ? " is-mine" : ""}`}
                onClick={() => vote(o.id)}
                disabled={!!voted}
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
        {voted ? `${total} vote${total > 1 ? "s" : ""}` : "Vote pour voir les résultats"}
      </span>
    </div>
  );
}
