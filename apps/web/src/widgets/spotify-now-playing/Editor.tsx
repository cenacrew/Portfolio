"use client";

// Live widget: data comes from /api/spotify (refresh token in env). Nothing to
// configure here — it shows an idle state until Spotify is connected.
export default function NowPlayingEditor() {
  return (
    <p className="ed-note">
      Ce widget affiche automatiquement ton titre Spotify en cours d’écoute. Rien à régler :
      connecte Spotify via les variables d’environnement (<code>SPOTIFY_REFRESH_TOKEN</code>).
    </p>
  );
}
