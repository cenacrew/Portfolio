import { NextResponse } from "next/server";
import { z } from "zod";
import { incrementReaction, reactionsSchema } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  widgetId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

// POST /api/reactions — increments one emoji counter for a reactions widget.
// The emoji must be one the widget actually offers (checked against its config),
// so a hand-crafted request can't seed arbitrary counters. Rate limited to ~10
// reactions/minute per IP.
export async function POST(req: Request) {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const limit = rateLimit(`reactions:${getClientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de réactions, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Réaction invalide." }, { status: 400 });
  }

  // The emoji must belong to this widget's declared set. Reading the widget also
  // confirms it exists and is a reactions tile.
  const { data, error } = await supabase
    .from("widgets")
    .select("type,config")
    .eq("id", parsed.widgetId)
    .eq("type", "reactions")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Widget introuvable." }, { status: 404 });
  }
  const cfg = reactionsSchema.safeParse((data as { config: unknown }).config);
  if (!cfg.success || !cfg.data.emojis.includes(parsed.emoji)) {
    return NextResponse.json({ error: "Emoji non proposé." }, { status: 422 });
  }

  try {
    const count = await incrementReaction(supabase, parsed.widgetId, parsed.emoji);
    return NextResponse.json({ ok: true, emoji: parsed.emoji, count });
  } catch {
    return NextResponse.json({ error: "Réaction impossible." }, { status: 500 });
  }
}
