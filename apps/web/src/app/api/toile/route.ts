import { NextResponse } from "next/server";
import { z } from "zod";
import { toilePath, toileSchema } from "@portfolio/shared";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getWidgets, updateWidget } from "@portfolio/shared";
import { getClientIp } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";
import { notifyAdmins } from "../_lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "widget-media";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is plenty for a 512×512 PNG.

const bodySchema = z.object({
  widgetId: z.string().uuid(),
  image: z.string().startsWith("data:image/png;base64,"),
});

// Visitor canvas upload. Service role writes the merged PNG to the bucket and
// bumps the widget's config.version (cache-bust + Realtime nudge). Rate limited
// to 1 send / 30s per IP; the client merges over the latest before posting.
export async function POST(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`toile:${ip}`, 1, 30_000);
  if (!limit.ok) {
    return NextResponse.json({ error: `Attends ${limit.retryAfter}s avant de renvoyer.` }, { status: 429 });
  }

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const base64 = body.image.slice("data:image/png;base64,".length);
  const bytes = Buffer.from(base64, "base64");
  // PNG magic number guard + size cap.
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    return NextResponse.json({ error: "Image invalide." }, { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image trop lourde." }, { status: 413 });
  }

  // The widget must exist and be a toile (avoids arbitrary bucket writes).
  let widget;
  try {
    const rows = await getWidgets(supabase, { includeHidden: true });
    widget = rows.find((w) => w.id === body.widgetId && w.type === "toile");
  } catch {
    return NextResponse.json({ error: "Widget introuvable." }, { status: 404 });
  }
  if (!widget) {
    return NextResponse.json({ error: "Toile introuvable." }, { status: 404 });
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(toilePath(body.widgetId), bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (upErr) {
    return NextResponse.json({ error: "Envoi impossible." }, { status: 500 });
  }

  // Bump version so the public <img> cache-busts and Realtime fires.
  const cfg = toileSchema.safeParse(widget.config);
  const nextVersion = (cfg.success ? cfg.data.version : 0) + 1;
  const nextConfig = cfg.success
    ? { ...cfg.data, version: nextVersion }
    : { title: "La toile", subtitle: "Laisse ta trace", version: nextVersion };
  try {
    await updateWidget(supabase, body.widgetId, { config: nextConfig });
  } catch {
    // The image is already saved; a failed version bump just delays refresh.
  }

  notifyAdmins("toile", {
    title: "🎨 Nouveau dessin sur la toile",
    body: "Quelqu'un a laissé une trace sur la toile.",
  });

  return NextResponse.json({ ok: true, version: nextVersion });
}
