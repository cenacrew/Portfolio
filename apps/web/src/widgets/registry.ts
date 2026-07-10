import type { WidgetSize } from "@portfolio/shared";
import { ALL_SIZES } from "@portfolio/shared";
import type { WidgetType } from "@portfolio/shared";
import { defineWidget, type RegistryEntry } from "./types";

import * as socialLink from "./social-link/schema";
import * as note from "./note/schema";
import * as locationMap from "./location-map/schema";
import * as guestbook from "./guestbook/schema";
import * as spotifyEmbed from "./spotify-embed/schema";
import * as nowPlaying from "./spotify-now-playing/schema";
import * as photo from "./photo/schema";
import * as video from "./video/schema";
import * as githubStats from "./github-stats/schema";
import * as status from "./status/schema";
import * as weather from "./weather/schema";
import * as countdown from "./countdown/schema";
import * as watchlist from "./watchlist/schema";
import * as visitorCounter from "./visitor-counter/schema";
import * as poll from "./poll/schema";
import * as freeLink from "./free-link/schema";
import * as youtubeEmbed from "./youtube-embed/schema";
import * as techStack from "./tech-stack/schema";
import * as paypal from "./paypal/schema";
import * as letterboxd from "./letterboxd/schema";
import * as toile from "./toile/schema";

import SocialLinkEditor from "./social-link/Editor";
import NoteEditor from "./note/Editor";
import LocationMapEditor from "./location-map/Editor";
import GuestbookEditor from "./guestbook/Editor";
import SpotifyEmbedEditor from "./spotify-embed/Editor";
import NowPlayingEditor from "./spotify-now-playing/Editor";
import PhotoEditor from "./photo/Editor";
import VideoEditor from "./video/Editor";
import GithubStatsEditor from "./github-stats/Editor";
import StatusEditor from "./status/Editor";
import WeatherEditor from "./weather/Editor";
import CountdownEditor from "./countdown/Editor";
import WatchlistEditor from "./watchlist/Editor";
import VisitorCounterEditor from "./visitor-counter/Editor";
import PollEditor from "./poll/Editor";
import FreeLinkEditor from "./free-link/Editor";
import YoutubeEmbedEditor from "./youtube-embed/Editor";
import TechStackEditor from "./tech-stack/Editor";
import PaypalEditor from "./paypal/Editor";
import LetterboxdEditor from "./letterboxd/Editor";
import ToileEditor from "./toile/Editor";

const s = (w: number, h: number): WidgetSize => ({ w, h });

// Client-safe registry: schema, defaults, label, sizes and admin Editor for
// each widget type. NO Renderer here (renderers are server components and live
// in renderers.tsx) so this module is importable from client components.
//
// Phase 4.5: every type offers the 9 universal sizes; `defaultSize` is the
// sensible starting size for a fresh widget. Each Renderer adapts per format.
//
// Add a widget type = one folder (schema + Renderer + Editor) + one entry here.
export const registry: Record<WidgetType, RegistryEntry> = {
  "social-link": defineWidget({
    schema: socialLink.socialLinkSchema,
    defaultConfig: socialLink.socialLinkDefault,
    label: socialLink.socialLinkLabel,
    description: "Lien vers un réseau social, icône de marque.",
    sizes: ALL_SIZES,
    defaultSize: s(1, 1),
    Editor: SocialLinkEditor,
  }),
  note: defineWidget({
    schema: note.noteSchema,
    defaultConfig: note.noteDefault,
    label: note.noteLabel,
    description: "Un mot libre, style post-it.",
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: NoteEditor,
  }),
  "location-map": defineWidget({
    schema: locationMap.locationMapSchema,
    defaultConfig: locationMap.locationMapDefault,
    label: locationMap.locationMapLabel,
    description: "Carte de ta ville.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: LocationMapEditor,
  }),
  guestbook: defineWidget({
    schema: guestbook.guestbookSchema,
    defaultConfig: guestbook.guestbookDefault,
    label: guestbook.guestbookLabel,
    description: "Les visiteurs laissent un mot.",
    sizes: ALL_SIZES,
    defaultSize: s(3, 2),
    Editor: GuestbookEditor,
  }),
  "spotify-embed": defineWidget({
    schema: spotifyEmbed.spotifyEmbedSchema,
    defaultConfig: spotifyEmbed.spotifyEmbedDefault,
    label: spotifyEmbed.spotifyEmbedLabel,
    description: "Playlist ou album Spotify intégré.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: SpotifyEmbedEditor,
  }),
  "spotify-now-playing": defineWidget({
    schema: nowPlaying.nowPlayingSchema,
    defaultConfig: nowPlaying.nowPlayingDefault,
    label: nowPlaying.nowPlayingLabel,
    description: "Le titre en cours d'écoute (live).",
    sizes: ALL_SIZES,
    defaultSize: s(2, 1),
    Editor: NowPlayingEditor,
  }),
  photo: defineWidget({
    schema: photo.photoSchema,
    defaultConfig: photo.photoDefault,
    label: photo.photoLabel,
    description: "Une photo ou un mini-carrousel.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: PhotoEditor,
  }),
  video: defineWidget({
    schema: video.videoSchema,
    defaultConfig: video.videoDefault,
    label: video.videoLabel,
    description: "Une vidéo en lecture auto, muette et en boucle.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: VideoEditor,
  }),
  "github-stats": defineWidget({
    schema: githubStats.githubStatsSchema,
    defaultConfig: githubStats.githubStatsDefault,
    label: githubStats.githubStatsLabel,
    description: "Graphe de contributions GitHub.",
    sizes: ALL_SIZES,
    defaultSize: s(3, 2),
    Editor: GithubStatsEditor,
  }),
  status: defineWidget({
    schema: status.statusSchema,
    defaultConfig: status.statusDefault,
    label: status.statusLabel,
    description: "Ton statut / humeur du moment.",
    sizes: ALL_SIZES,
    defaultSize: s(2, 1),
    Editor: StatusEditor,
  }),
  weather: defineWidget({
    schema: weather.weatherSchema,
    defaultConfig: weather.weatherDefault,
    label: weather.weatherLabel,
    description: "Météo locale (Open-Meteo).",
    sizes: ALL_SIZES,
    defaultSize: s(1, 1),
    Editor: WeatherEditor,
  }),
  countdown: defineWidget({
    schema: countdown.countdownSchema,
    defaultConfig: countdown.countdownDefault,
    label: countdown.countdownLabel,
    description: "Compte à rebours vers une date.",
    sizes: ALL_SIZES,
    defaultSize: s(1, 1),
    Editor: CountdownEditor,
  }),
  watchlist: defineWidget({
    schema: watchlist.watchlistSchema,
    defaultConfig: watchlist.watchlistDefault,
    label: watchlist.watchlistLabel,
    description: "Films / séries en cours.",
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: WatchlistEditor,
  }),
  "visitor-counter": defineWidget({
    schema: visitorCounter.visitorCounterSchema,
    defaultConfig: visitorCounter.visitorCounterDefault,
    label: visitorCounter.visitorCounterLabel,
    description: "Compteur de visites (live).",
    sizes: ALL_SIZES,
    defaultSize: s(1, 1),
    Editor: VisitorCounterEditor,
  }),
  poll: defineWidget({
    schema: poll.pollSchema,
    defaultConfig: poll.pollDefault,
    label: poll.pollLabel,
    description: "Un sondage, les visiteurs votent.",
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: PollEditor,
  }),
  "free-link": defineWidget({
    schema: freeLink.freeLinkSchema,
    defaultConfig: freeLink.freeLinkDefault,
    label: freeLink.freeLinkLabel,
    description: "N'importe quelle URL (titre + visuel).",
    sizes: ALL_SIZES,
    defaultSize: s(2, 1),
    Editor: FreeLinkEditor,
  }),
  "youtube-embed": defineWidget({
    schema: youtubeEmbed.youtubeEmbedSchema,
    defaultConfig: youtubeEmbed.youtubeEmbedDefault,
    label: youtubeEmbed.youtubeEmbedLabel,
    description: "Une vidéo YouTube intégrée.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: YoutubeEmbedEditor,
  }),
  "tech-stack": defineWidget({
    schema: techStack.techStackSchema,
    defaultConfig: techStack.techStackDefault,
    label: techStack.techStackLabel,
    description: "Grille de badges de tes technos.",
    sizes: ALL_SIZES,
    defaultSize: s(3, 2),
    Editor: TechStackEditor,
  }),
  paypal: defineWidget({
    schema: paypal.paypalSchema,
    defaultConfig: paypal.paypalDefault,
    label: paypal.paypalLabel,
    description: "Tuile de don paypal.me, sobre.",
    sizes: ALL_SIZES,
    defaultSize: s(2, 1),
    Editor: PaypalEditor,
  }),
  letterboxd: defineWidget({
    schema: letterboxd.letterboxdSchema,
    defaultConfig: letterboxd.letterboxdDefault,
    label: letterboxd.letterboxdLabel,
    description: "Tes 4 derniers films notés (Letterboxd).",
    sizes: ALL_SIZES,
    defaultSize: s(2, 3),
    Editor: LetterboxdEditor,
  }),
  toile: defineWidget({
    schema: toile.toileSchema,
    defaultConfig: toile.toileDefault,
    label: toile.toileLabel,
    description: "Toile collaborative : les visiteurs dessinent.",
    bleed: true,
    sizes: ALL_SIZES,
    defaultSize: s(2, 2),
    Editor: ToileEditor,
  }),
};

export function getWidgetDefinition(type: WidgetType): RegistryEntry {
  return registry[type];
}
