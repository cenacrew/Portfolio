"use client";

import { useEffect, useRef, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { VisitorCounterConfig } from "./schema";

const SESSION_KEY = "qr-visit-counted";

// Live counter. Increments once per browser session (sessionStorage guard) via
// the visits RPC; subsequent loads just read the total. Falls back to the
// config seed when Supabase isn't configured (API returns count: null).
export default function VisitorCounterRenderer({ config }: WidgetRendererProps<VisitorCounterConfig>) {
  const [target, setTarget] = useState<number>(config.count);
  const [n, setN] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const counted = typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY);
    const method = counted ? "GET" : "POST";
    fetch("/api/visits", { method })
      .then((r) => r.json())
      .then((json: { count: number | null }) => {
        if (typeof json.count === "number") {
          setTarget(json.count);
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* private mode */
          }
        }
      })
      .catch(() => {
        /* keep seed */
      });
  }, []);

  // Count-up animation toward the current target.
  useEffect(() => {
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
  }, [target]);

  return (
    <div className="w-visits">
      <span className="w-eyebrow">👀 Ils sont passés</span>
      <span className="w-visits__num">{n.toLocaleString("fr-FR")}</span>
      <span className="w-visits__label">{config.label}</span>
    </div>
  );
}
