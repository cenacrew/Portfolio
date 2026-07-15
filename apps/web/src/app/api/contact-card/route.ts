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

// GET /api/contact-card?widgetId=<uuid>
// Loads the contact-card widget, builds a properly escaped vCard (RFC 6350
// escaping, optional embedded photo) and streams it as a .vcf download. The
// public tile falls back to a client-built, photo-less vCard when this returns
// a non-2xx (offline / QA console / unknown id), so it never leaves the visitor
// without a card.
export async function GET(req: Request) {
  const widgetId = new URL(req.url).searchParams.get("widgetId");
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
    ? new URL(CONTACT_CARD_HEADER_AVATAR, new URL(req.url).origin).toString()
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
      "Content-Disposition": `attachment; filename="${vcardFileStem(c)}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
