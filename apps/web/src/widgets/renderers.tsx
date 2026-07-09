import type { WidgetType } from "@portfolio/shared";
import type { WidgetRenderer } from "./types";

import SocialLinkRenderer from "./social-link/Renderer";
import NoteRenderer from "./note/Renderer";
import LocationMapRenderer from "./location-map/Renderer";
import GuestbookRenderer from "./guestbook/Renderer";
import SpotifyEmbedRenderer from "./spotify-embed/Renderer";
import NowPlayingRenderer from "./spotify-now-playing/Renderer";
import PhotoRenderer from "./photo/Renderer";
import VideoRenderer from "./video/Renderer";
import GithubStatsRenderer from "./github-stats/Renderer";
import StatusRenderer from "./status/Renderer";
import WeatherRenderer from "./weather/Renderer";
import CountdownRenderer from "./countdown/Renderer";
import WatchlistRenderer from "./watchlist/Renderer";
import VisitorCounterRenderer from "./visitor-counter/Renderer";
import PollRenderer from "./poll/Renderer";
import FreeLinkRenderer from "./free-link/Renderer";

// Renderer map, kept separate from the client-safe registry because some
// renderers are async server components (they read Supabase / fetch APIs).
// Only imported from server code (public WidgetTile, admin server preview).
export const renderers: Record<WidgetType, WidgetRenderer<unknown>> = {
  "social-link": SocialLinkRenderer as WidgetRenderer<unknown>,
  note: NoteRenderer as WidgetRenderer<unknown>,
  "location-map": LocationMapRenderer as WidgetRenderer<unknown>,
  guestbook: GuestbookRenderer as WidgetRenderer<unknown>,
  "spotify-embed": SpotifyEmbedRenderer as WidgetRenderer<unknown>,
  "spotify-now-playing": NowPlayingRenderer as WidgetRenderer<unknown>,
  photo: PhotoRenderer as WidgetRenderer<unknown>,
  video: VideoRenderer as WidgetRenderer<unknown>,
  "github-stats": GithubStatsRenderer as WidgetRenderer<unknown>,
  status: StatusRenderer as WidgetRenderer<unknown>,
  weather: WeatherRenderer as WidgetRenderer<unknown>,
  countdown: CountdownRenderer as WidgetRenderer<unknown>,
  watchlist: WatchlistRenderer as WidgetRenderer<unknown>,
  "visitor-counter": VisitorCounterRenderer as WidgetRenderer<unknown>,
  poll: PollRenderer as WidgetRenderer<unknown>,
  "free-link": FreeLinkRenderer as WidgetRenderer<unknown>,
};
