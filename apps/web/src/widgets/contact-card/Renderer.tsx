/* eslint-disable @next/next/no-img-element */
import { CONTACT_CARD_HEADER_AVATAR, contactFullName } from "@portfolio/shared";
import type { WidgetRendererProps } from "../types";
import type { ContactCardConfig } from "./schema";
import AddToContacts from "./AddToContacts";

// Small line icons for the contact rows, drawn locally (no CDN). Each row only
// renders when its field is set — the card stays tidy at any format.
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

// Strips the scheme/trailing slash from a website URL so the card shows a clean
// "cenacrew.com" instead of the full href.
function prettyHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

// A business-card tile. The header avatar (or a custom photo) sits on an
// embossed card; the visitor taps "Ajouter à mes contacts" to download a vCard.
// Adapts from a compact avatar + name in a 1×1 tile up to the full card with
// contact rows in roomier formats — handled by container queries in qrcode.css.
export default function ContactCardRenderer({ config, widget }: WidgetRendererProps<ContactCardConfig>) {
  const name = contactFullName(config) || "Contact";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const photo = config.useHeaderAvatar ? CONTACT_CARD_HEADER_AVATAR : config.photoUrl;

  return (
    <div className="w-vcard">
      <div className="w-vcard__top">
        <span className="w-vcard__avatar" aria-hidden>
          {photo ? <img src={photo} alt="" /> : <span className="w-vcard__initials">{initials}</span>}
        </span>
        <span className="w-vcard__id">
          <span className="w-vcard__name">{name}</span>
          {config.role && <span className="w-vcard__role">{config.role}</span>}
          {config.org && <span className="w-vcard__org">{config.org}</span>}
        </span>
      </div>

      {(config.phone || config.email || config.website) && (
        <ul className="w-vcard__rows">
          {config.phone && (
            <li className="w-vcard__row">
              <PhoneIcon />
              <span>{config.phone}</span>
            </li>
          )}
          {config.email && (
            <li className="w-vcard__row">
              <MailIcon />
              <span>{config.email}</span>
            </li>
          )}
          {config.website && (
            <li className="w-vcard__row">
              <GlobeIcon />
              <span>{prettyHost(config.website)}</span>
            </li>
          )}
        </ul>
      )}

      <AddToContacts widgetId={widget.id} config={config} />
    </div>
  );
}
