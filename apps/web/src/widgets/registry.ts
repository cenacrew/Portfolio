import type { WidgetType } from "@portfolio/shared";
import { defineWidget, type RegistryEntry } from "./types";

import SocialLinkRenderer from "./social-link/Renderer";
import * as socialLink from "./social-link/schema";
import NoteRenderer from "./note/Renderer";
import * as note from "./note/schema";
import LocationMapRenderer from "./location-map/Renderer";
import * as locationMap from "./location-map/schema";
import GuestbookRenderer from "./guestbook/Renderer";
import * as guestbook from "./guestbook/schema";
import SpotifyEmbedRenderer from "./spotify-embed/Renderer";
import * as spotifyEmbed from "./spotify-embed/schema";
import NowPlayingRenderer from "./spotify-now-playing/Renderer";
import * as nowPlaying from "./spotify-now-playing/schema";
import PhotoRenderer from "./photo/Renderer";
import * as photo from "./photo/schema";
import GithubStatsRenderer from "./github-stats/Renderer";
import * as githubStats from "./github-stats/schema";
import StatusRenderer from "./status/Renderer";
import * as status from "./status/schema";
import WeatherRenderer from "./weather/Renderer";
import * as weather from "./weather/schema";
import CountdownRenderer from "./countdown/Renderer";
import * as countdown from "./countdown/schema";
import WatchlistRenderer from "./watchlist/Renderer";
import * as watchlist from "./watchlist/schema";
import VisitorCounterRenderer from "./visitor-counter/Renderer";
import * as visitorCounter from "./visitor-counter/schema";
import PollRenderer from "./poll/Renderer";
import * as poll from "./poll/schema";
import FreeLinkRenderer from "./free-link/Renderer";
import * as freeLink from "./free-link/schema";

// Add a widget type = one folder + one line below. Nothing else.
export const registry: Record<WidgetType, RegistryEntry> = {
  "social-link": defineWidget({
    schema: socialLink.socialLinkSchema,
    defaultConfig: socialLink.socialLinkDefault,
    label: socialLink.socialLinkLabel,
    Renderer: SocialLinkRenderer,
  }),
  note: defineWidget({
    schema: note.noteSchema,
    defaultConfig: note.noteDefault,
    label: note.noteLabel,
    Renderer: NoteRenderer,
  }),
  "location-map": defineWidget({
    schema: locationMap.locationMapSchema,
    defaultConfig: locationMap.locationMapDefault,
    label: locationMap.locationMapLabel,
    bleed: true,
    Renderer: LocationMapRenderer,
  }),
  guestbook: defineWidget({
    schema: guestbook.guestbookSchema,
    defaultConfig: guestbook.guestbookDefault,
    label: guestbook.guestbookLabel,
    Renderer: GuestbookRenderer,
  }),
  "spotify-embed": defineWidget({
    schema: spotifyEmbed.spotifyEmbedSchema,
    defaultConfig: spotifyEmbed.spotifyEmbedDefault,
    label: spotifyEmbed.spotifyEmbedLabel,
    bleed: true,
    Renderer: SpotifyEmbedRenderer,
  }),
  "spotify-now-playing": defineWidget({
    schema: nowPlaying.nowPlayingSchema,
    defaultConfig: nowPlaying.nowPlayingDefault,
    label: nowPlaying.nowPlayingLabel,
    Renderer: NowPlayingRenderer,
  }),
  photo: defineWidget({
    schema: photo.photoSchema,
    defaultConfig: photo.photoDefault,
    label: photo.photoLabel,
    bleed: true,
    Renderer: PhotoRenderer,
  }),
  "github-stats": defineWidget({
    schema: githubStats.githubStatsSchema,
    defaultConfig: githubStats.githubStatsDefault,
    label: githubStats.githubStatsLabel,
    Renderer: GithubStatsRenderer,
  }),
  status: defineWidget({
    schema: status.statusSchema,
    defaultConfig: status.statusDefault,
    label: status.statusLabel,
    Renderer: StatusRenderer,
  }),
  weather: defineWidget({
    schema: weather.weatherSchema,
    defaultConfig: weather.weatherDefault,
    label: weather.weatherLabel,
    Renderer: WeatherRenderer,
  }),
  countdown: defineWidget({
    schema: countdown.countdownSchema,
    defaultConfig: countdown.countdownDefault,
    label: countdown.countdownLabel,
    Renderer: CountdownRenderer,
  }),
  watchlist: defineWidget({
    schema: watchlist.watchlistSchema,
    defaultConfig: watchlist.watchlistDefault,
    label: watchlist.watchlistLabel,
    Renderer: WatchlistRenderer,
  }),
  "visitor-counter": defineWidget({
    schema: visitorCounter.visitorCounterSchema,
    defaultConfig: visitorCounter.visitorCounterDefault,
    label: visitorCounter.visitorCounterLabel,
    Renderer: VisitorCounterRenderer,
  }),
  poll: defineWidget({
    schema: poll.pollSchema,
    defaultConfig: poll.pollDefault,
    label: poll.pollLabel,
    Renderer: PollRenderer,
  }),
  "free-link": defineWidget({
    schema: freeLink.freeLinkSchema,
    defaultConfig: freeLink.freeLinkDefault,
    label: freeLink.freeLinkLabel,
    Renderer: FreeLinkRenderer,
  }),
};

export function getWidgetDefinition(type: WidgetType): RegistryEntry {
  return registry[type];
}
