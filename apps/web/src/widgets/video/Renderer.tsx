/* eslint-disable jsx-a11y/media-has-caption */
import type { WidgetRendererProps } from "../types";
import type { VideoConfig } from "./schema";

// Public video tile: autoplay + muted + loop + playsInline, cover-filling the
// tile whatever its format. No controls, no carousel — it just plays quietly.
// `muted` is required for autoplay to be allowed by browsers.
export default function VideoRenderer({ config }: WidgetRendererProps<VideoConfig>) {
  if (!config.src) {
    return (
      <div className="w-video w-video--empty">
        <span className="w-video__glyph" aria-hidden>
          ▶
        </span>
        <span>Aucune vidéo</span>
      </div>
    );
  }

  return (
    <div className="w-video">
      <video
        className="w-video__el"
        src={config.src}
        poster={config.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {config.caption && <span className="w-video__caption">{config.caption}</span>}
    </div>
  );
}
