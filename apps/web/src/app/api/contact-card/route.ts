import { NextResponse } from "next/server";
import {
  buildVCard,
  contactCardSchema,
  CONTACT_CARD_HEADER_AVATAR,
  vcardFileStem,
} from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap the embedded photo so a hand-crafted URL can't bloat the vCard.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// Fetches an image and returns it as base64 + MIME, or null on any failure
// (the vCard is still valid without a photo).
async function fetchPhoto(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_PHOTO_BYTES) return null;
    return { base64: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

// GET /api/contact-card?widgetId=<uuid>[&download=1]
// Loads the contact-card widget and builds a properly escaped vCard (RFC 6350
// escaping, optional embedded photo).
//
// Content-Disposition defaults to INLINE: navigating to this URL on Android/iOS
// hands the text/vcard response straight to the OS, which opens the native "add
// to contacts" sheet instead of dropping a .vcf into Downloads (phase 17 bug 4).
// `?download=1` forces `attachment` for desktop, where browsers have no inline
// vcard handler and a file download is the sensible behavior. The public tile
// picks the right mode per device (see AddToContacts) and still falls back to a
// client-built, photo-less vCard when this returns a non-2xx (offline / QA
// console / unknown id), so it never leaves the visitor without a card.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const widgetId = url.searchParams.get("widgetId");
  const download = url.searchParams.get("download") === "1";
  if (!widgetId) {
    return NextResponse.json({ error: "widgetId manquant." }, { status: 400 });
  }

  const supabase = getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // RLS returns only visible widgets — exactly the public tile's scope.
  const { data, error } = await supabase
    .from("widgets")
    .select("type,config")
    .eq("id", widgetId)
    .eq("type", "contact-card")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const parsed = contactCardSchema.safeParse((data as { config: unknown }).config);
  if (!parsed.success) {
    return NextResponse.json({ error: "Carte invalide." }, { status: 422 });
  }
  const c = parsed.data;

  // Resolve the photo: the header avatar (absolute from the request origin) when
  // reuse is on, otherwise the custom photo URL. Embedding is best-effort.
  const photoUrl = c.useHeaderAvatar
    ? new URL(CONTACT_CARD_HEADER_AVATAR, url.origin).toString()
    : c.photoUrl;
  const photo = photoUrl ? await fetchPhoto(photoUrl) : null;

  const vcard = buildVCard({
    firstName: c.firstName,
    lastName: c.lastName,
    role: c.role,
    org: c.org,
    phone: c.phone,
    email: c.email,
    website: c.website,
    photoBase64: photo?.base64,
    photoMime: photo?.mime,
  });

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${vcardFileStem(c)}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
