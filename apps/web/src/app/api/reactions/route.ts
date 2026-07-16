import { NextResponse } from "next/server";
import { z } from "zod";
import { getReactionCounts, reactionsSchema, toggleReaction } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp, voterHash } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";
import { notifyAdmins } from "../_lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  widgetId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

// POST /api/reactions — toggles ONE emoji for a reactions widget (phase 19).
// A visitor has one active reaction per emoji: first tap adds it, a second tap
// (same salted IP+UA hash) removes it (like/unlike). The emoji must either be
// one the widget offers (config) or an already-created custom counter, so a
// hand-crafted request can't seed arbitrary counters. Rate limited to ~20
// taps/minute per IP as a backstop on top of the per-visitor server guard.
export async function POST(req: Request) {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const limit = rateLimit(`reactions:${getClientIp(req)}`, 20, 60_000);
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

  // The widget must exist and be a reactions tile.
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
  if (!cfg.success) {
    return NextResponse.json({ error: "Widget invalide." }, { status: 422 });
  }

  // The emoji must be offered by the widget OR already exist as a custom
  // counter (added earlier through /api/reactions/custom). This blocks seeding
  // arbitrary emojis here while still letting visitors react to customs.
  let offered = cfg.data.emojis.includes(parsed.emoji);
  if (!offered) {
    const counts = await getReactionCounts(supabase, parsed.widgetId);
    offered = Object.prototype.hasOwnProperty.call(counts, parsed.emoji);
  }
  if (!offered) {
    return NextResponse.json({ error: "Emoji non proposé." }, { status: 422 });
  }

  try {
    const { count, active } = await toggleReaction(supabase, parsed.widgetId, parsed.emoji, voterHash(req));
    // Only a fresh reaction (not an un-react) is worth a push.
    if (active) {
      notifyAdmins("reactions", {
        title: "Nouvelle réaction",
        body: `${parsed.emoji} sur le dashboard`,
      });
    }
    return NextResponse.json({ ok: true, emoji: parsed.emoji, count, active });
  } catch {
    return NextResponse.json({ error: "Réaction impossible." }, { status: 500 });
  }
}
