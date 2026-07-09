/* eslint-disable @next/next/no-img-element */
import type { WidgetRendererProps } from "../types";
import type { FreeLinkConfig } from "./schema";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function FreeLinkRenderer({
  config,
}: WidgetRendererProps<FreeLinkConfig>) {
  return (
    <a className="w-flink" href={config.url} target="_blank" rel="noreferrer">
      {config.image ? (
        <img className="w-flink__img" src={config.image} alt="" />
      ) : (
        <span
          className="w-flink__img w-flink__img--ph"
          style={config.accent ? { background: config.accent } : undefined}
          aria-hidden
        >
          {config.emoji ?? "🔗"}
        </span>
      )}
      <div className="w-flink__body">
        <span className="w-flink__title">{config.title}</span>
        {config.description && (
          <span className="w-flink__desc">{config.description}</span>
        )}
        <span className="w-flink__host">
          {host(config.url)}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </a>
  );
}
