"use client";

import { useRef, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { VideoConfig } from "./schema";

// Public video tile: autoplay + muted + loop + playsInline, cover-filling the
// tile whatever its format. No controls, no carousel — it just plays quietly.
// `muted` is required for autoplay to be allowed by browsers. When `tapToUnmute`
// is on, tapping the tile toggles the sound and shows a discreet 🔇/🔊 hint.
export default function VideoRenderer({ config }: WidgetRendererProps<VideoConfig>) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const canUnmute = Boolean(config.tapToUnmute);

  if (!config.src) {
    return (
      <div className="w-video w-video--empty">
        <span className="w-video__glyph" aria-hidden>
          ▶
        </span>
        <span>Aucune vidéo</span>
      </div>
    );
  }

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    // A user gesture lets us (re)start playback with sound if autoplay had paused.
    if (!next) void el.play().catch(() => {});
    setMuted(next);
  };

  return (
    <div className="w-video">
      <video
        ref={ref}
        className="w-video__el"
        src={config.src}
        poster={config.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {canUnmute && (
        <button
          type="button"
          className="w-video__sound"
          onClick={toggle}
          aria-label={muted ? "Activer le son" : "Couper le son"}
          aria-pressed={!muted}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}
      {config.caption && <span className="w-video__caption">{config.caption}</span>}
    </div>
  );
}
