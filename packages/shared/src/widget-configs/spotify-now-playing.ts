import { z } from "zod";

// Phase 2: shape mirrors what the phase-3 API route (/api/spotify) will
// return, so the Renderer stays unchanged when the mock is swapped for the
// live Spotify Web API response.
export const nowPlayingSchema = z.object({
  isPlaying: z.boolean(),
  track: z.string(),
  artist: z.string(),
  albumArt: z.string().optional(),
  progressMs: z.number().nonnegative(),
  durationMs: z.number().positive(),
});

export type NowPlayingConfig = z.infer<typeof nowPlayingSchema>;

export const nowPlayingDefault: NowPlayingConfig = {
  isPlaying: true,
  track: "Titre",
  artist: "Artiste",
  progressMs: 0,
  durationMs: 200000,
};

export const nowPlayingLabel = "Spotify — en écoute";
