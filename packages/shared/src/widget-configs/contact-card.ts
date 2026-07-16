import { z } from "zod";

// A "business card" tile: the visitor taps "Ajouter à mes contacts" and gets a
// .vcf (vCard) download that imports straight into their phone's contacts. The
// config carries the card fields; the vCard bytes are generated on the server
// (proper RFC 6350 escaping + optional embedded photo) — see
// apps/web/src/app/api/contact-card/route.ts. The client falls back to a
// photo-less vCard built from this same config when the server can't be reached
// (offline / QA console), so the tile always downloads something valid.
export const contactCardSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).default(""),
  // Optional line shown under the name — a job title / role.
  role: z.string().max(120).optional(),
  org: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  website: z.string().max(200).optional(),
  // A photo for the card + vCard. When `useHeaderAvatar` is on, the server
  // embeds the dashboard header avatar instead of this URL.
  photoUrl: z.string().max(400).optional(),
  useHeaderAvatar: z.boolean().default(true),
});

export type ContactCardConfig = z.infer<typeof contactCardSchema>;

export const contactCardDefault: ContactCardConfig = {
  firstName: "Valentin",
  lastName: "Sourdois Pajot",
  useHeaderAvatar: true,
};

export const contactCardLabel = "Carte de contact";

import type { WidgetMediaSpec } from "./media-spec";

// Media: the optional card photo (only when not using the header avatar).
export const contactCardMedia: WidgetMediaSpec = {
  urls: (config) => [(config as Partial<ContactCardConfig>)?.photoUrl],
};

// The dashboard header avatar, reused on the card when `useHeaderAvatar` is on.
// A site-relative path (served from apps/web/public); the server turns it into
// an absolute URL to fetch + embed in the vCard photo.
export const CONTACT_CARD_HEADER_AVATAR = "/files/img/pp.png";

// Full display name, trimmed. Used for FN and the card heading.
export function contactFullName(c: Pick<ContactCardConfig, "firstName" | "lastName">): string {
  return [c.firstName, c.lastName].map((s) => (s ?? "").trim()).filter(Boolean).join(" ");
}

// ---------- vCard (RFC 6350) generation ------------------------------------
// Escapes a text value per RFC 6350 §3.4: backslash, comma, semicolon and
// newlines are the reserved characters inside a property value.
export function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// One shared encoder — allocating a TextEncoder per character turned folding
// the base64 PHOTO line (~2.7 M chars for a 2 MB photo) into hundreds of ms.
const VCARD_ENCODER = new TextEncoder();

// Folds one content line to 75 octets max (RFC 6350 §3.2): continuation lines
// begin with a single space (so their budget is 74 octets of content). UTF-8
// aware so a multi-byte character is never split across a fold. Emits CRLF.
function foldLine(line: string): string {
  const byteLength = VCARD_ENCODER.encode(line).length;
  if (byteLength <= 75) return line;
  // Fast path: pure ASCII (byte length === char length) — the base64 PHOTO
  // line and every plain field. Each char is one octet, so slice by index and
  // skip the per-character encoding entirely.
  if (byteLength === line.length) {
    const parts: string[] = [line.slice(0, 75)];
    for (let i = 75; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
    return parts.join("\r\n ");
  }
  // General path (multi-byte text): fold on UTF-8 character boundaries so a
  // code point is never split. Only runs for short, non-ASCII field values.
  const out: string[] = [];
  let chunkBytes = 0;
  let chunk = "";
  let first = true;
  for (const ch of line) {
    const chBytes = VCARD_ENCODER.encode(ch).length;
    const budget = first ? 75 : 74;
    if (chunkBytes + chBytes > budget) {
      out.push(chunk);
      chunk = "";
      chunkBytes = 0;
      first = false;
    }
    chunk += ch;
    chunkBytes += chBytes;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

export interface VCardInput {
  firstName: string;
  lastName?: string;
  role?: string;
  org?: string;
  phone?: string;
  email?: string;
  website?: string;
  // Raw base64 (no data: prefix) of an embedded photo + its MIME type.
  photoBase64?: string;
  photoMime?: string;
}

// Maps a MIME type to the vCard 3.0 photo TYPE token (JPEG/PNG/GIF/WEBP).
function photoType(mime: string): string {
  const sub = mime.split("/")[1]?.toUpperCase() ?? "JPEG";
  if (sub === "JPG") return "JPEG";
  return sub;
}

// Builds a vCard 3.0 document. 3.0 is the most broadly importable version on
// both Android and iOS (the escaping rules are shared with RFC 6350). Values are
// escaped, lines folded and terminated with CRLF.
export function buildVCard(input: VCardInput): string {
  const first = (input.firstName ?? "").trim();
  const last = (input.lastName ?? "").trim();
  const fn = [first, last].filter(Boolean).join(" ") || first || last;

  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  // N = Family;Given;Additional;Prefix;Suffix
  lines.push(`N:${escapeVCardValue(last)};${escapeVCardValue(first)};;;`);
  lines.push(`FN:${escapeVCardValue(fn)}`);
  if (input.org?.trim()) lines.push(`ORG:${escapeVCardValue(input.org.trim())}`);
  if (input.role?.trim()) lines.push(`TITLE:${escapeVCardValue(input.role.trim())}`);
  if (input.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(input.phone.trim())}`);
  if (input.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(input.email.trim())}`);
  if (input.website?.trim()) lines.push(`URL:${escapeVCardValue(input.website.trim())}`);
  if (input.photoBase64) {
    lines.push(`PHOTO;ENCODING=b;TYPE=${photoType(input.photoMime ?? "image/jpeg")}:${input.photoBase64}`);
  }
  lines.push("END:VCARD");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// A safe ASCII filename stem for the downloaded .vcf ("valentin-sourdois-pajot").
export function vcardFileStem(c: Pick<ContactCardConfig, "firstName" | "lastName">): string {
  const stem = contactFullName(c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "contact";
}
