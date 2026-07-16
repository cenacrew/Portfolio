import { z } from "zod";

// A single looping video tile. No carousel (product decision): one video per
// widget, played muted + autoplay + loop in the public tile. Uploaded to the
// widget-media bucket from the mobile admin. `poster` is an optional still shown
// before playback / when autoplay is blocked.
export const videoSchema = z.object({
  src: z.string().min(1),
  poster: z.string().optional(),
  caption: z.string().optional(),
  // When true, the muted autoplay loop stays, but tapping the tile toggles the
  // sound (with a discreet 🔇/🔊 indicator). Default false (silent as before);
  // older configs without the field keep playing muted (phase 11).
  tapToUnmute: z.boolean().default(false),
});

export type VideoConfig = z.infer<typeof videoSchema>;

export const videoDefault: VideoConfig = {
  src: "",
  tapToUnmute: false,
};

export const videoLabel = "Vidéo";

import type { WidgetMediaSpec } from "./media-spec";

// Media: the video file and its optional poster still.
export const videoMedia: WidgetMediaSpec = {
  urls: (config) => {
    const c = config as Partial<VideoConfig>;
    return [c?.src, c?.poster];
  },
};
