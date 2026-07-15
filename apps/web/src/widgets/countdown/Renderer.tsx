"use client";

import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { CountdownConfig } from "./schema";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    d: Math.floor(ms / 864e5),
    h: Math.floor((ms / 36e5) % 24),
    m: Math.floor((ms / 6e4) % 60),
    s: Math.floor((ms / 1000) % 60),
    done: ms === 0,
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

  return (
    <div className="w-cd">
      <div className="w-cd__head">
        <span className="w-cd__emoji" aria-hidden>
          {config.emoji}
        </span>
        <span className="w-eyebrow">{config.title}</span>
      </div>
      {t?.done ? (
        <p className="w-cd__done">C&apos;est le jour&nbsp;! 🎉</p>
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
