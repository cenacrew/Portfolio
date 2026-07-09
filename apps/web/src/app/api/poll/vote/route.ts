import { NextResponse } from "next/server";
import { z } from "zod";
import { getVoterChoice, insertVote } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp, voterHash } from "../../_lib/request";
import { rateLimit } from "../../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  widgetId: z.string().uuid(),
  option: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`poll:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de votes." }, { status: 429 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Vote invalide." }, { status: 400 });
  }

  // voter_hash = salted hash of IP + UA, computed server-side. The DB unique
  // constraint (widget_id, voter_hash) enforces one vote per visitor.
  const hash = voterHash(req);
  try {
    const already = await getVoterChoice(supabase, parsed.widgetId, hash);
    if (already) {
      return NextResponse.json({ ok: true, option: already, alreadyVoted: true });
    }
    await insertVote(supabase, { widgetId: parsed.widgetId, option: parsed.option, voterHash: hash });
    return NextResponse.json({ ok: true, option: parsed.option });
  } catch {
    return NextResponse.json({ error: "Vote impossible." }, { status: 500 });
  }
}
