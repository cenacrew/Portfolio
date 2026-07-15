import { NextResponse } from "next/server";
import { z } from "zod";
import {
  GAME_KEYS,
  getTopScores,
  insertGameScore,
  isPlausibleScore,
  LEADERBOARD_SIZE,
  pseudoSchema,
  sanitizePseudo,
} from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  game: z.enum(GAME_KEYS),
  // Accept loose input and normalise to arcade initials before validating, so a
  // trailing space or lowercase from the client still lands cleanly.
  pseudo: z.string().transform(sanitizePseudo).pipe(pseudoSchema),
  score: z.number().int().min(0),
});

// POST /api/scores — records a mini-game run on the shared leaderboard.
// Anonymous writes never touch the table directly: this route validates the
// game, the 3-letter pseudo and a per-game plausibility ceiling, then inserts
// with the service role. Rate limited to ~15 submissions/minute per IP so the
// board can't be flooded. Rejects forged scores above the game's cap (422).
export async function POST(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    // Without the service role there is no safe write path (anon has no insert
    // policy), so scoring is unavailable rather than silently dropped.
    return NextResponse.json({ error: "Classement non configuré." }, { status: 503 });
  }

  const limit = rateLimit(`scores:${getClientIp(req)}`, 15, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop d'envois, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Score invalide." }, { status: 400 });
  }

  // A believable ceiling per game blocks scripted requests claiming absurd
  // numbers. Real runs sit far below the cap.
  if (!isPlausibleScore(parsed.game, parsed.score)) {
    return NextResponse.json({ error: "Score refusé." }, { status: 422 });
  }

  try {
    await insertGameScore(supabase, parsed);
    // Return the fresh top board so the modal can render it immediately.
    const board = await getTopScores(supabase, parsed.game, LEADERBOARD_SIZE);
    return NextResponse.json({ ok: true, board });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}

// GET /api/scores?game=snake — public read of the top board. Used as a fallback
// refresh; the modal also reads directly via the browser client + Realtime.
export async function GET(req: Request) {
  const supabase = getPublicServerSupabase();
  if (!supabase) return NextResponse.json({ board: [] });

  const game = new URL(req.url).searchParams.get("game");
  if (!game || !(GAME_KEYS as readonly string[]).includes(game)) {
    return NextResponse.json({ error: "Jeu inconnu." }, { status: 400 });
  }
  try {
    const board = await getTopScores(supabase, game, LEADERBOARD_SIZE);
    return NextResponse.json({ board });
  } catch {
    return NextResponse.json({ board: [] });
  }
}
