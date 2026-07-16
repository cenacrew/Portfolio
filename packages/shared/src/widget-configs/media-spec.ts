// Per-widget media capability declaration (phase 16).
//
// Each widget type that references objects in the widget-media bucket declares
// HOW here, next to its schema — the single source of truth consumed by the
// storage-hygiene helpers (extractMediaPaths / pruneWidgetMedia) and the two
// duplication paths (duplicateDashboard / duplicateWidget). Adding a new
// media-bearing widget means declaring its spec once, not editing a switch and
// three copy sites.
//
// Two orthogonal kinds of media:
//   - URL media: the config holds public Storage URLs (photo/video/file/
//     contact-card/cv-timeline). `urls(config)` returns them; the caller maps
//     each to its bucket path.
//   - id-keyed media: an object stored at a path derived from the widget id,
//     with no URL in the config (the collaborative toile PNG). `idKeyedPath`
//     returns that path; `copyOnDuplicate` asks the duplication paths to carry
//     the object over to the new widget's id.
export interface WidgetMediaSpec {
  // Public Storage URLs the config references. May include null/undefined
  // holes (optional fields) — the caller ignores them.
  urls?(config: unknown): (string | null | undefined)[];
  // Bucket path for id-keyed media (e.g. the toile PNG).
  idKeyedPath?(widgetId: string): string;
  // When true, duplicating the widget copies its id-keyed object to the new id.
  copyOnDuplicate?: boolean;
}
