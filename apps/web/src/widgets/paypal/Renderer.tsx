import type { WidgetRendererProps } from "../types";
import type { PaypalConfig } from "./schema";

// Sober donation tile → paypal.me/<handle>. No hard sell: a calm card with the
// real PayPal mark, the message, and a clear action. Adapts down to a 1x1 (icon
// + short label only) via container queries in qrcode.css.
export default function PaypalRenderer({ config }: WidgetRendererProps<PaypalConfig>) {
  const href = `https://paypal.me/${encodeURIComponent(config.handle)}`;
  return (
    <a className="w-paypal" href={href} target="_blank" rel="noreferrer">
      <span className="w-paypal__icon" aria-hidden>
        {/* PayPal monogram — two overlapping P's, brand blues. */}
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <path fill="#002991" d="M6.9 21.3H3.6a.55.55 0 0 1-.54-.64L5.7 3.9A.78.78 0 0 1 6.47 3.25h5.9c2.03 0 3.6.43 4.47 1.42.4.45.65.94.77 1.5-.63-.34-1.38-.53-2.24-.6a9.6 9.6 0 0 0-.9-.04h-4.66a.78.78 0 0 0-.77.65L7.4 18.9l-.5 2.4z"/>
          <path fill="#60cdff" d="M18.28 7.5c.05.29.05.63 0 1.02-.62 3.98-3.02 5.35-6.08 5.35H10.9a.75.75 0 0 0-.74.64l-.98 6.2-.28 1.76a.4.4 0 0 0 .39.46h2.76a.66.66 0 0 0 .65-.55l.03-.14.52-3.28.03-.18a.66.66 0 0 1 .65-.56h.41c2.68 0 4.77-1.09 5.38-4.23.26-1.31.13-2.41-.46-3.18a2.2 2.2 0 0 0-.83-.66z"/>
          <path fill="#008cff" d="M17.55 7.22a5.4 5.4 0 0 0-.66-.15 8.4 8.4 0 0 0-.9-.11 9.6 9.6 0 0 0-.9-.04h-4.66a.65.65 0 0 0-.28.06.66.66 0 0 0-.37.49L8.8 15.5l-.03.2a.75.75 0 0 1 .74-.64h1.3c3.06 0 5.46-1.37 6.08-5.35.05-.39.05-.73 0-1.02a3.6 3.6 0 0 0-.56-.28l-.04-.02c-.23-.09-.47-.14-.74-.17z"/>
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
