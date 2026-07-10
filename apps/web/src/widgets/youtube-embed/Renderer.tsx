import { youtubeId } from "@portfolio/shared";
import type { WidgetRendererProps } from "../types";
import type { YoutubeEmbedConfig } from "./schema";

export default function YoutubeEmbedRenderer({
  config,
}: WidgetRendererProps<YoutubeEmbedConfig>) {
  const id = youtubeId(config.url);
  if (!id) {
    return <div className="w-fallback">Lien YouTube invalide</div>;
  }
  // Fill the tile at every format; the privacy-enhanced host avoids extra cookies.
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return (
    <div className="w-yt">
      <iframe
        className="w-yt-embed"
        src={src}
        title={config.title ?? "YouTube"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {config.title ? <span className="w-yt__title">{config.title}</span> : null}
    </div>
  );
}
