"use client";

import { useEffect, useRef, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { VisitorCounterConfig } from "./schema";

// Phase 2: mock value. Counts up from 0 on mount for a lively feel.
// Phase 3 swaps the seed for a Supabase RPC (increment_visits).
export default function VisitorCounterRenderer({
  config,
}: WidgetRendererProps<VisitorCounterConfig>) {
  const [n, setN] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const target = config.count;
    const dur = 1100;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [config.count]);

  return (
    <div className="w-visits">
      <span className="w-eyebrow">👀 Ils sont passés</span>
      <span className="w-visits__num">{n.toLocaleString("fr-FR")}</span>
      <span className="w-visits__label">{config.label}</span>
    </div>
  );
}
