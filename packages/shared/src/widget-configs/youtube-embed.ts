import { z } from "zod";

export const youtubeEmbedSchema = z.object({
  // Any YouTube video URL (watch?v=, youtu.be/, /shorts/, /embed/).
  url: z.string().url(),
  title: z.string().optional(),
});

export type YoutubeEmbedConfig = z.infer<typeof youtubeEmbedSchema>;

export const youtubeEmbedDefault: YoutubeEmbedConfig = {
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

export const youtubeEmbedLabel = "Vidéo YouTube";

// Extracts the 11-char video id from any common YouTube URL shape. Returns null
// when the URL isn't a recognizable YouTube link (renderer shows a fallback).
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "shorts" || p === "embed" || p === "v");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    // fall through
  }
  const m = url.match(/[a-zA-Z0-9_-]{11}/);
  return m ? m[0] : null;
}
