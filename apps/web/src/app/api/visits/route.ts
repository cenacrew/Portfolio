import { NextResponse } from "next/server";
import { getVisits, incrementVisits } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";

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
// the new total. Runs through the security-definer RPC.
export async function POST() {
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) return NextResponse.json({ count: null });
  try {
    return NextResponse.json({ count: await incrementVisits(supabase) });
  } catch {
    return NextResponse.json({ count: null });
  }
}
