import type { WidgetRendererProps } from "../types";
import type { SocialLinkConfig } from "./schema";
import { BRANDS } from "./brands";

export default function SocialLinkRenderer({
  config,
}: WidgetRendererProps<SocialLinkConfig>) {
  const brand = BRANDS[config.platform];
  const href =
    config.platform === "email" && !config.url.startsWith("mailto:")
      ? `mailto:${config.url}`
      : config.url;

  return (
    <a
      className="w-social"
      href={href}
      target={config.platform === "email" ? undefined : "_blank"}
      rel="noreferrer"
      style={{ background: brand.gradient, color: brand.fg }}
      aria-label={`${brand.name}${config.handle ? ` — ${config.handle}` : ""}`}
    >
      <span className="w-social__glyph">{brand.glyph}</span>
      <span className="w-social__meta">
        <span className="w-social__name">{config.label ?? brand.name}</span>
        {config.handle && (
          <span className="w-social__handle">{config.handle}</span>
        )}
      </span>
      <svg
        className="w-social__arrow"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden
      >
        <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
