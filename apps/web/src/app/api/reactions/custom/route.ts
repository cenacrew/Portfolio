import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureCustomReaction,
  isSingleEmoji,
  reactionsSchema,
  REACTIONS_CUSTOM_CAP,
} from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp } from "../../_lib/request";
import { rateLimit } from "../../_lib/rateLimit";
import { notifyAdmins } from "../../_lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  widgetId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

// POST /api/reactions/custom — a visitor adds a new emoji to a reactions tile
// (phase 19). Server-side STRICT validation: exactly one emoji grapheme (never
// arbitrary text). Creates the counter row (count 0) for everyone, capped at
// REACTIONS_CUSTOM_CAP custom emojis per widget. The new emoji reaches all
// visitors via widget_reactions Realtime. Rate limited per IP.
export async function POST(req: Request) {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const limit = rateLimit(`reactions-custom:${getClientIp(req)}`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop d'ajouts, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Strict: a single emoji grapheme only. Rejects text, digits, multi-emoji.
  if (!isSingleEmoji(parsed.emoji)) {
    return NextResponse.json({ error: "Merci de choisir un seul emoji." }, { status: 422 });
  }

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

  try {
    await ensureCustomReaction(supabase, parsed.widgetId, parsed.emoji, cfg.data.emojis, REACTIONS_CUSTOM_CAP);
    notifyAdmins("reactions", {
      title: "Nouvel emoji",
      body: `${parsed.emoji} ajouté sur le dashboard`,
    });
    return NextResponse.json({ ok: true, emoji: parsed.emoji });
  } catch (e) {
    const msg = (e as { message?: string } | null)?.message ?? "";
    if (msg.includes("custom emoji cap")) {
      return NextResponse.json(
        { error: "Trop d'emojis personnalisés sur cette tuile." },
        { status: 409 },
      );
    }
    // Pre-migration (RPC missing) or any other failure: unavailable, don't crash.
    return NextResponse.json({ error: "Ajout impossible pour le moment." }, { status: 503 });
  }
}
