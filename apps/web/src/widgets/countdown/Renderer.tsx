"use client";

import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { CountdownConfig } from "./schema";

// Time parts for a signed millisecond span. `done` is true once the target is
// reached; `elapsed` splits the time SINCE the target for the "since" counter.
function diff(target: number) {
  const now = Date.now();
  const remaining = Math.max(0, target - now);
  const since = Math.max(0, now - target);
  return {
    d: Math.floor(remaining / 864e5),
    h: Math.floor((remaining / 36e5) % 24),
    m: Math.floor((remaining / 6e4) % 60),
    s: Math.floor((remaining / 1000) % 60),
    done: remaining === 0,
    // Elapsed days / hours since the target (whole days, then hours within day).
    ed: Math.floor(since / 864e5),
    eh: Math.floor((since / 36e5) % 24),
  };
}

export default function CountdownRenderer({
  config,
}: WidgetRendererProps<CountdownConfig>) {
  const target = new Date(config.target).getTime();
  // Compute only after mount to avoid SSR/CSR hydration mismatch.
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    // Compute the countdown only after mount to avoid an SSR/CSR hydration
    // mismatch; setState-in-effect is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cell = (v: number | undefined, l: string) => (
    <span className="w-cd__cell">
      <b>{v === undefined ? "--" : String(v).padStart(2, "0")}</b>
      <i>{l}</i>
    </span>
  );

  const behavior = config.endBehavior ?? "message";

  // Reached + hide: render nothing so the tile vanishes the instant it ticks to
  // zero while a visitor is watching. The server loader also filters these out
  // so they never take a grid slot on a fresh load.
  if (t?.done && behavior === "hide") return null;

  return (
    <div className="w-cd">
      <div className="w-cd__head">
        <span className="w-cd__emoji" aria-hidden>
          {config.emoji}
        </span>
        <span className="w-eyebrow">{config.title}</span>
      </div>
      {t?.done ? (
        behavior === "elapsed" ? (
          <div className="w-cd__grid">
            {cell(t?.ed, "j")}
            {cell(t?.eh, "h")}
            <span className="w-cd__cell w-cd__cell--since">
              <i>depuis</i>
            </span>
          </div>
        ) : (
          <p className="w-cd__done">{config.endMessage || "C'est parti 🎉"}</p>
        )
      ) : (
        <div className="w-cd__grid">
          {cell(t?.d, "j")}
          {cell(t?.h, "h")}
          {cell(t?.m, "min")}
          {cell(t?.s, "s")}
        </div>
      )}
    </div>
  );
}
