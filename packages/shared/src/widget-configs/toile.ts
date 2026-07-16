import { z } from "zod";

// Collaborative canvas (phase 4.8 A7). A single square PNG lives in the
// widget-media bucket at a path derived from the widget id; visitors draw on it
// from a modal and the merged result is uploaded (last-write-wins). The config
// only carries presentation + a bumped `version` used for cache-busting the
// public <img> and to nudge Realtime refreshes.
export const toileSchema = z.object({
  title: z.string().default("La toile"),
  subtitle: z.string().default("Laisse ta trace"),
  version: z.number().int().nonnegative().default(0),
});

export type ToileConfig = z.infer<typeof toileSchema>;

export const toileDefault: ToileConfig = {
  title: "La toile",
  subtitle: "Laisse ta trace",
  version: 0,
};

export const toileLabel = "Toile collaborative";

// Canvas raster size and the bucket path for a given widget id.
export const TOILE_SIZE = 512;
export function toilePath(widgetId: string): string {
  return `toile/${widgetId}.png`;
}
export function toileArchivePath(widgetId: string): string {
  return `toile/archive/${widgetId}-${Date.now()}.png`;
}

import type { WidgetMediaSpec } from "./media-spec";

// Media: the live canvas PNG lives at an id-derived path (no URL in the config).
// Copied on duplication so a duplicated toile keeps its drawing. Archives
// (toile/archive/*) are intentional and never pruned.
export const toileMedia: WidgetMediaSpec = {
  idKeyedPath: toilePath,
  copyOnDuplicate: true,
};

// Public URL of a toile's PNG in the widget-media bucket. `version` cache-busts
// the browser <img> so a fresh upload shows immediately (bumped on every send).
export function toilePublicUrl(supabaseUrl: string, widgetId: string, version = 0): string {
  return `${supabaseUrl}/storage/v1/object/public/widget-media/${toilePath(widgetId)}?v=${version}`;
}
