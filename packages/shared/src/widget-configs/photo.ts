import { z } from "zod";

export const photoSchema = z.object({
  images: z
    .array(
      z.object({
        src: z.string().min(1),
        alt: z.string().default(""),
        caption: z.string().optional(),
        // Optional click target (phase 11). When set, tapping this slide's image
        // opens the URL in a new tab; the carousel arrows/dots stay usable. Older
        // configs without the field simply aren't clickable.
        linkUrl: z.string().optional(),
      }),
    )
    .min(1),
  // Auto-advance delay for the carousel, in seconds. Default 5 (the historical
  // behaviour). 0 = no auto-advance, navigation via the buttons/dots only.
  // Existing configs without the field fall back to 5 via this default (no data
  // migration needed).
  intervalSec: z.number().int().min(0).max(60).default(5),
});

export type PhotoConfig = z.infer<typeof photoSchema>;

export const photoDefault: PhotoConfig = {
  images: [{ src: "/files/img/pp.png", alt: "" }],
  intervalSec: 5,
};

export const photoLabel = "Photo / mini-galerie";

import type { WidgetMediaSpec } from "./media-spec";

// Media: every slide's `src` is a widget-media URL.
export const photoMedia: WidgetMediaSpec = {
  urls: (config) => {
    const images = (config as Partial<PhotoConfig>)?.images;
    return Array.isArray(images) ? images.map((i) => i?.src) : [];
  },
};
