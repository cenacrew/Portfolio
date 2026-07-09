"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { PhotoConfig } from "./schema";

export default function PhotoRenderer({ config }: WidgetRendererProps<PhotoConfig>) {
  const [i, setI] = useState(0);
  const many = config.images.length > 1;
  const current = config.images[i];

  const go = (dir: number) =>
    setI((p) => (p + dir + config.images.length) % config.images.length);

  return (
    <div className="w-photo">
      <img className="w-photo__img" src={current.src} alt={current.alt} />

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
                onClick={() => setI(d)}
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
