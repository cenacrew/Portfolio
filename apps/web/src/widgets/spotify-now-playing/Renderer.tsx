"use client";

import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { NowPlayingConfig } from "./schema";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Phase 2: mock data. The progress bar advances client-side to feel alive.
// Phase 3 replaces the seed with a poll to /api/spotify (same shape).
export default function NowPlayingRenderer({
  config,
}: WidgetRendererProps<NowPlayingConfig>) {
  const [progress, setProgress] = useState(config.progressMs);

  useEffect(() => {
    if (!config.isPlaying) return;
    const id = setInterval(() => {
      setProgress((p) => (p + 1000 > config.durationMs ? 0 : p + 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [config.isPlaying, config.durationMs]);

  const pct = Math.min(100, (progress / config.durationMs) * 100);

  return (
    <div className="w-np">
      <div className="w-np__head">
        <span className="w-np__badge">
          <span className={`w-np__eq${config.isPlaying ? " is-playing" : ""}`}>
            <i /><i /><i />
          </span>
          {config.isPlaying ? "En écoute" : "Dernier titre"}
        </span>
      </div>

      <div className="w-np__row">
        {config.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="w-np__art" src={config.albumArt} alt="" />
        ) : (
          <span className="w-np__art w-np__art--ph" aria-hidden>
            ♪
          </span>
        )}
        <div className="w-np__meta">
          <span className="w-np__track">{config.track}</span>
          <span className="w-np__artist">{config.artist}</span>
        </div>
      </div>

      <div className="w-np__bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="w-np__time">
        <span>{fmt(progress)}</span>
        <span>{fmt(config.durationMs)}</span>
      </div>
    </div>
  );
}
