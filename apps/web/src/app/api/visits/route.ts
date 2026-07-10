import { NextResponse } from "next/server";
import { getVisits, incrementVisits } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: read the counter without incrementing (repeat loads in a session).
export async function GET() {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) return NextResponse.json({ count: null });
  try {
    return NextResponse.json({ count: await getVisits(supabase) });
  } catch {
    return NextResponse.json({ count: null });
  }
}

// POST: count a new visit (once per session, enforced client-side) and return
// the new total. Runs through the security-definer RPC. Rate limited per IP so
// a client that bypasses the once-per-session guard can't inflate the counter.
export async function POST(req: Request) {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) return NextResponse.json({ count: null });

  const limit = rateLimit(`visits:${getClientIp(req)}`, 3, 60_000);
  if (!limit.ok) {
    // Already counted recently: return the current total without incrementing.
    try {
      return NextResponse.json({ count: await getVisits(supabase) });
    } catch {
      return NextResponse.json({ count: null });
    }
  }

  try {
    return NextResponse.json({ count: await incrementVisits(supabase) });
  } catch {
    return NextResponse.json({ count: null });
  }
}
