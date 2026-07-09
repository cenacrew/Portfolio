import type { WidgetRendererProps } from "../types";
import type { SpotifyEmbedConfig } from "./schema";

// Turn any open.spotify.com/<type>/<id> URL into its official embed URL.
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}?utm_source=generator`;
  } catch {
    return null;
  }
}

export default function SpotifyEmbedRenderer({
  config,
}: WidgetRendererProps<SpotifyEmbedConfig>) {
  const embed = toEmbed(config.url);
  if (!embed) {
    return <div className="w-fallback">Lien Spotify invalide</div>;
  }
  return (
    <iframe
      className="w-spotify-embed"
      src={embed}
      title={config.title ?? "Spotify"}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
