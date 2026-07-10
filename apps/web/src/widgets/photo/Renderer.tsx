"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { PhotoConfig } from "./schema";

export default function PhotoRenderer({ config }: WidgetRendererProps<PhotoConfig>) {
  const [i, setI] = useState(0);
  // Bumped on every manual change so the autoplay timer restarts (phase 4.8 B6).
  const [tick, setTick] = useState(0);
  const many = config.images.length > 1;
  const current = config.images[i];

  // Auto-advance every 5s; a manual nav resets the countdown via `tick`.
  useEffect(() => {
    if (!many) return;
    const id = setInterval(() => setI((p) => (p + 1) % config.images.length), 5000);
    return () => clearInterval(id);
  }, [many, config.images.length, tick]);

  const go = (dir: number) => {
    setI((p) => (p + dir + config.images.length) % config.images.length);
    setTick((t) => t + 1);
  };
  const jump = (d: number) => {
    setI(d);
    setTick((t) => t + 1);
  };

  return (
    <div className="w-photo">
      <Image
        className="w-photo__img"
        src={current.src}
        alt={current.alt}
        fill
        sizes="(max-width: 640px) 45vw, 320px"
        unoptimized={current.src.startsWith("data:")}
      />

      {current.caption && <span className="w-photo__caption">{current.caption}</span>}

      {many && (
        <>
          <button
            className="w-photo__nav w-photo__nav--prev"
            onClick={() => go(-1)}
            aria-label="Photo précédente"
          >
            ‹
          </button>
          <button
            className="w-photo__nav w-photo__nav--next"
            onClick={() => go(1)}
            aria-label="Photo suivante"
          >
            ›
          </button>
          <div className="w-photo__dots" role="tablist">
            {config.images.map((_, d) => (
              <button
                key={d}
                className={`w-photo__dot${d === i ? " is-active" : ""}`}
                onClick={() => jump(d)}
                aria-label={`Photo ${d + 1}`}
                aria-selected={d === i}
                role="tab"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
