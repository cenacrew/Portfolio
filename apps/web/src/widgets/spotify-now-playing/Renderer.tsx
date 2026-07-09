"use client";

import { useEffect, useRef, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { NowPlayingConfig } from "./schema";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Track = {
  isPlaying: boolean;
  track: string;
  artist: string;
  albumArt?: string;
  progressMs: number;
  durationMs: number;
};

// Live widget: polls /api/spotify every 30s. `null` (nothing playing / Spotify
// not configured) renders a calm idle state instead of breaking.
export default function NowPlayingRenderer(_: WidgetRendererProps<NowPlayingConfig>) {
  const [data, setData] = useState<Track | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/spotify");
        const json = (await res.json()) as Track | null;
        if (!alive) return;
        setData(json);
        setProgress(json?.progressMs ?? 0);
        progressRef.current = json?.progressMs ?? 0;
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoaded(true);
      }
    };
    load();
    const poll = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, []);

  // Advance the progress bar between polls for a live feel.
  useEffect(() => {
    if (!data?.isPlaying) return;
    const id = setInterval(() => {
      progressRef.current = Math.min(data.durationMs, progressRef.current + 1000);
      setProgress(progressRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [data]);

  if (loaded && !data) {
    return (
      <div className="w-np w-np--idle">
        <span className="w-np__badge">
          <span className="w-np__eq">
            <i />
            <i />
            <i />
          </span>
          Spotify
        </span>
        <span className="w-np__idle-text">Pas d’écoute en cours</span>
      </div>
    );
  }

  const pct = data ? Math.min(100, (progress / data.durationMs) * 100) : 0;

  return (
    <div className="w-np">
      <div className="w-np__head">
        <span className="w-np__badge">
          <span className={`w-np__eq${data?.isPlaying ? " is-playing" : ""}`}>
            <i />
            <i />
            <i />
          </span>
          {data?.isPlaying ? "En écoute" : "Dernier titre"}
        </span>
      </div>

      <div className="w-np__row">
        {data?.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="w-np__art" src={data.albumArt} alt="" />
        ) : (
          <span className="w-np__art w-np__art--ph" aria-hidden>
            ♪
          </span>
        )}
        <div className="w-np__meta">
          <span className="w-np__track">{data?.track ?? "—"}</span>
          <span className="w-np__artist">{data?.artist ?? ""}</span>
        </div>
      </div>

      <div className="w-np__bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="w-np__time">
        <span>{fmt(progress)}</span>
        <span>{fmt(data?.durationMs ?? 0)}</span>
      </div>
    </div>
  );
}
