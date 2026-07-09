"use client";

import dynamic from "next/dynamic";
import type { WidgetRendererProps } from "../types";
import type { LocationMapConfig } from "./schema";

// Leaflet touches `window`, so the map must never render on the server.
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => <div className="w-map__skeleton" aria-hidden />,
});

export default function LocationMapRenderer({
  config,
}: WidgetRendererProps<LocationMapConfig>) {
  return (
    <div className="w-map">
      <MapClient config={config} />
      <div className="w-map__label">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        <span>{config.caption ?? config.city}</span>
      </div>
    </div>
  );
}
