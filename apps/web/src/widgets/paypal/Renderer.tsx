import type { WidgetRendererProps } from "../types";
import type { PaypalConfig } from "./schema";

// Sober donation tile → paypal.me/<handle>. No hard sell: a calm card with a
// coffee glyph, the message, and a clear action. Adapts down to a 1x1 (icon +
// short label only) via container queries in qrcode.css.
export default function PaypalRenderer({ config }: WidgetRendererProps<PaypalConfig>) {
  const href = `https://paypal.me/${encodeURIComponent(config.handle)}`;
  return (
    <a className="w-paypal" href={href} target="_blank" rel="noreferrer">
      <span className="w-paypal__icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h13a3 3 0 0 1 0 6h-2" />
          <path d="M4 8v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
          <path d="M7 3v2M10 3v2M13 3v2" />
        </svg>
      </span>
      <div className="w-paypal__body">
        <span className="w-paypal__title">{config.title}</span>
        {config.subtitle && <span className="w-paypal__sub">{config.subtitle}</span>}
      </div>
      <span className="w-paypal__cta" aria-hidden>
        paypal.me/{config.handle}
      </span>
    </a>
  );
}
