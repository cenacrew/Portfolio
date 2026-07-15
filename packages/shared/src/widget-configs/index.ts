// Per-type widget config schemas (Zod) shared between the web registry and
// the mobile admin app. Each file owns one widget type's config schema,
// defaults and label. Moved here from apps/web so the mobile app can reuse the
// exact same validation without depending on apps/web.
export * from "./social-link";
export * from "./note";
export * from "./location-map";
export * from "./guestbook";
export * from "./spotify-embed";
export * from "./spotify-now-playing";
export * from "./photo";
export * from "./video";
export * from "./github-stats";
export * from "./status";
export * from "./weather";
export * from "./countdown";
export * from "./watchlist";
export * from "./visitor-counter";
export * from "./poll";
export * from "./free-link";
export * from "./youtube-embed";
export * from "./tech-stack";
export * from "./paypal";
export * from "./letterboxd";
export * from "./toile";
export * from "./lol";
export * from "./file-download";
