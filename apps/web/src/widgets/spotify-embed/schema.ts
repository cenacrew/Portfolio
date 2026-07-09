import { z } from "zod";

export const spotifyEmbedSchema = z.object({
  // A standard open.spotify.com URL (playlist, album, track or artist).
  url: z.string().url(),
  title: z.string().optional(),
});

export type SpotifyEmbedConfig = z.infer<typeof spotifyEmbedSchema>;

export const spotifyEmbedDefault: SpotifyEmbedConfig = {
  url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
};

export const spotifyEmbedLabel = "Playlist Spotify (embed)";
