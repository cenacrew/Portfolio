import { NextResponse } from "next/server";
import { z } from "zod";
import { changeVote, getVoterChoice } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp, voterHash } from "../../_lib/request";
import { rateLimit } from "../../_lib/rateLimit";
import { notifyAdmins } from "../../_lib/push";

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
    // Phase 4.8 B8: a visitor can change their vote — the previous choice is
    // replaced. `previous` lets the client adjust its optimistic counts.
    const previous = await getVoterChoice(supabase, parsed.widgetId, hash);
    if (previous !== parsed.option) {
      await changeVote(supabase, { widgetId: parsed.widgetId, option: parsed.option, voterHash: hash });
      // Only a genuine change (new vote or switched choice) is worth a push.
      notifyAdmins("poll", {
        title: "🗳️ Nouveau vote au sondage",
        body: previous ? "Un visiteur a changé son vote." : "Un visiteur vient de voter.",
      });
    }
    return NextResponse.json({ ok: true, option: parsed.option, previous });
  } catch {
    return NextResponse.json({ error: "Vote impossible." }, { status: 500 });
  }
}
