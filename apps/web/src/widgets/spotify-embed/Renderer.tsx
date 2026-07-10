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
  // The iframe fills roomy tiles; on narrow 1-column tiles (1x1…1x4) the embed
  // player can't fit its controls, so a compact link card is shown instead via
  // container queries (phase 4.10 A4).
  return (
    <div className="w-spe">
      <iframe
        className="w-spotify-embed"
        src={embed}
        title={config.title ?? "Spotify"}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
      <a className="w-spe__compact" href={config.url} target="_blank" rel="noreferrer">
        <span className="w-spe__logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.36-2.11-10.54-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34.35.22.47.68.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.54-1.8c4.37-1.32 9.79-.68 13.5 1.6.44.27.58.85.3 1.29zm.13-3.4C16.36 8.98 9.9 8.77 6.18 9.9a1.12 1.12 0 1 1-.65-2.15c4.27-1.3 11.4-1.05 15.9 1.62a1.12 1.12 0 1 1-1.15 1.92z" />
          </svg>
        </span>
        <span className="w-spe__meta">
          <span className="w-spe__title">{config.title ?? "Écouter sur Spotify"}</span>
          <span className="w-spe__cta">Ouvrir dans Spotify</span>
        </span>
      </a>
    </div>
  );
}
