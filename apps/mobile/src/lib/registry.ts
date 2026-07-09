import type { WidgetSize, WidgetType } from "@portfolio/shared";
import {
  countdownDefault,
  countdownLabel,
  countdownSchema,
  freeLinkDefault,
  freeLinkLabel,
  freeLinkSchema,
  githubStatsDefault,
  githubStatsLabel,
  githubStatsSchema,
  guestbookDefault,
  guestbookLabel,
  guestbookSchema,
  locationMapDefault,
  locationMapLabel,
  locationMapSchema,
  noteDefault,
  noteLabel,
  noteSchema,
  nowPlayingDefault,
  nowPlayingLabel,
  nowPlayingSchema,
  photoDefault,
  photoLabel,
  photoSchema,
  pollDefault,
  pollLabel,
  pollSchema,
  socialLinkDefault,
  socialLinkLabel,
  socialLinkSchema,
  spotifyEmbedDefault,
  spotifyEmbedLabel,
  spotifyEmbedSchema,
  statusDefault,
  statusLabel,
  statusSchema,
  visitorCounterDefault,
  visitorCounterLabel,
  visitorCounterSchema,
  watchlistDefault,
  watchlistLabel,
  watchlistSchema,
  weatherDefault,
  weatherLabel,
  weatherSchema,
} from "@portfolio/shared";
import type { ZodTypeAny } from "zod";

// Mobile widget registry. Reuses the SHARED per-type Zod schemas, defaults and
// labels (single source of truth with the web app). The sizes / descriptions
// / emoji mirror the web registry (apps/web/src/widgets/registry.ts); keep the
// two in sync when a widget type's declared sizes change.

const s = (w: number, h: number): WidgetSize => ({ w, h });

export type MobileWidgetMeta = {
  schema: ZodTypeAny;
  defaultConfig: unknown;
  label: string;
  description: string;
  emoji: string;
  sizes: readonly WidgetSize[];
};

export const registry: Record<WidgetType, MobileWidgetMeta> = {
  "social-link": {
    schema: socialLinkSchema,
    defaultConfig: socialLinkDefault,
    label: socialLinkLabel,
    description: "Lien vers un réseau social.",
    emoji: "🔗",
    sizes: [s(1, 1), s(2, 1)],
  },
  note: {
    schema: noteSchema,
    defaultConfig: noteDefault,
    label: noteLabel,
    description: "Un mot libre, style post-it.",
    emoji: "📝",
    sizes: [s(1, 1), s(2, 1), s(1, 2), s(2, 2)],
  },
  "location-map": {
    schema: locationMapSchema,
    defaultConfig: locationMapDefault,
    label: locationMapLabel,
    description: "Carte de ta ville.",
    emoji: "📍",
    sizes: [s(2, 2), s(2, 1), s(3, 2)],
  },
  guestbook: {
    schema: guestbookSchema,
    defaultConfig: guestbookDefault,
    label: guestbookLabel,
    description: "Les visiteurs laissent un mot.",
    emoji: "💌",
    sizes: [s(3, 2), s(2, 2), s(2, 3)],
  },
  "spotify-embed": {
    schema: spotifyEmbedSchema,
    defaultConfig: spotifyEmbedDefault,
    label: spotifyEmbedLabel,
    description: "Playlist ou album Spotify.",
    emoji: "🎧",
    sizes: [s(2, 2), s(2, 1), s(3, 2)],
  },
  "spotify-now-playing": {
    schema: nowPlayingSchema,
    defaultConfig: nowPlayingDefault,
    label: nowPlayingLabel,
    description: "Le titre en cours d'écoute.",
    emoji: "🎵",
    sizes: [s(2, 1), s(2, 2)],
  },
  photo: {
    schema: photoSchema,
    defaultConfig: photoDefault,
    label: photoLabel,
    description: "Une photo ou un mini-carrousel.",
    emoji: "🖼️",
    sizes: [s(2, 2), s(1, 1), s(2, 1), s(3, 2)],
  },
  "github-stats": {
    schema: githubStatsSchema,
    defaultConfig: githubStatsDefault,
    label: githubStatsLabel,
    description: "Graphe de contributions GitHub.",
    emoji: "🐙",
    sizes: [s(3, 2), s(2, 2), s(4, 2)],
  },
  status: {
    schema: statusSchema,
    defaultConfig: statusDefault,
    label: statusLabel,
    description: "Ton statut / humeur du moment.",
    emoji: "💬",
    sizes: [s(2, 1), s(3, 1), s(2, 2)],
  },
  weather: {
    schema: weatherSchema,
    defaultConfig: weatherDefault,
    label: weatherLabel,
    description: "Météo locale (Open-Meteo).",
    emoji: "⛅",
    sizes: [s(1, 1), s(2, 1)],
  },
  countdown: {
    schema: countdownSchema,
    defaultConfig: countdownDefault,
    label: countdownLabel,
    description: "Compte à rebours vers une date.",
    emoji: "⏳",
    sizes: [s(1, 1), s(2, 1), s(2, 2)],
  },
  watchlist: {
    schema: watchlistSchema,
    defaultConfig: watchlistDefault,
    label: watchlistLabel,
    description: "Films / séries en cours.",
    emoji: "🎬",
    sizes: [s(2, 2), s(2, 3), s(3, 2)],
  },
  "visitor-counter": {
    schema: visitorCounterSchema,
    defaultConfig: visitorCounterDefault,
    label: visitorCounterLabel,
    description: "Compteur de visites (live).",
    emoji: "👀",
    sizes: [s(1, 1), s(2, 1)],
  },
  poll: {
    schema: pollSchema,
    defaultConfig: pollDefault,
    label: pollLabel,
    description: "Un sondage, les visiteurs votent.",
    emoji: "📊",
    sizes: [s(1, 2), s(2, 2), s(2, 3)],
  },
  "free-link": {
    schema: freeLinkSchema,
    defaultConfig: freeLinkDefault,
    label: freeLinkLabel,
    description: "N'importe quelle URL.",
    emoji: "✨",
    sizes: [s(2, 1), s(1, 1), s(2, 2)],
  },
};

export function meta(type: WidgetType): MobileWidgetMeta {
  return registry[type];
}

export const ALL_TYPES = Object.keys(registry) as WidgetType[];
