// Central registry of per-type media specs (phase 16). Assembled from the
// declarations that live next to each widget's schema. This is the single place
// the storage helpers and duplication paths look up how a widget references
// bucket objects — a new media-bearing widget only has to export a spec and add
// one line here.
import type { WidgetType } from "../widget";
import type { WidgetMediaSpec } from "./media-spec";
import { photoMedia } from "./photo";
import { videoMedia } from "./video";
import { fileDownloadMedia } from "./file-download";
import { contactCardMedia } from "./contact-card";
import { cvTimelineMedia } from "./cv-timeline";
import { toileMedia } from "./toile";

export type { WidgetMediaSpec } from "./media-spec";

export const WIDGET_MEDIA_SPECS: Partial<Record<WidgetType, WidgetMediaSpec>> = {
  photo: photoMedia,
  video: videoMedia,
  "file-download": fileDownloadMedia,
  "contact-card": contactCardMedia,
  "cv-timeline": cvTimelineMedia,
  toile: toileMedia,
};

// The widget types that can reference bucket media. Used to scope DB scans so
// pruning never reads rows that can't possibly hold a media path.
export const MEDIA_TYPES = Object.keys(WIDGET_MEDIA_SPECS) as WidgetType[];
