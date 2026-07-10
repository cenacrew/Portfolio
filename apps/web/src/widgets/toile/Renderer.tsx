"use client";

/* eslint-disable @next/next/no-img-element */
import { toilePublicUrl } from "@portfolio/shared";
import { useState } from "react";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import type { WidgetRendererProps } from "../types";
import type { ToileConfig } from "./schema";
import ToileModal from "./ToileModal";

// Public collaborative canvas tile. Shows the current PNG from the widget-media
// bucket (cache-busted by config.version, refreshed live via Realtime); tapping
// opens the drawing modal. Degrades to a "blank canvas" invite when the image
// doesn't exist yet or Supabase isn't configured.
export default function ToileRenderer({ config, widget }: WidgetRendererProps<ToileConfig>) {
  const env = publicSupabaseEnv();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const url = env ? toilePublicUrl(env.url, widget.id, config.version) : null;

  return (
    <>
      <button
        className={`w-toile${!url || broken ? " w-toile--empty" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={`${config.title} — dessiner`}
      >
        {url && !broken ? (
          <img className="w-toile__img" src={url} alt={config.title} onError={() => setBroken(true)} />
        ) : (
          // Empty toile: a clean white canvas (no broken-image icon), just a
          // discreet pencil invite (phase 4.10 A13).
          <span className="w-toile__blank" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7a2.1 2.1 0 0 0-3-3l-7 7-1 4 4-1z" />
              <path d="M14 7l3 3" />
            </svg>
          </span>
        )}
        <span className="w-toile__label">
          <span className="w-toile__title">{config.title}</span>
          <span className="w-toile__sub">{config.subtitle}</span>
        </span>
      </button>

      {open && env && (
        <ToileModal
          widgetId={widget.id}
          supabaseUrl={env.url}
          version={config.version}
          title={config.title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
