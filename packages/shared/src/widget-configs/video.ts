import { z } from "zod";

// A single looping video tile. No carousel (product decision): one video per
// widget, played muted + autoplay + loop in the public tile. Uploaded to the
// widget-media bucket from the mobile admin. `poster` is an optional still shown
// before playback / when autoplay is blocked.
export const videoSchema = z.object({
  src: z.string().min(1),
  poster: z.string().optional(),
  caption: z.string().optional(),
});

export type VideoConfig = z.infer<typeof videoSchema>;

export const videoDefault: VideoConfig = {
  src: "",
};

export const videoLabel = "Vidéo";
