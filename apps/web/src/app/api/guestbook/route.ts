import { NextResponse } from "next/server";
import { z } from "zod";
import { insertGuestbookMessage } from "@portfolio/shared";
import { getServiceSupabase, getPublicServerSupabase } from "@/lib/supabase/server";
import { getClientIp } from "../_lib/request";
import { rateLimit } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  author: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(280),
});

export async function POST(req: Request) {
  // Trusted insert path: service role when available, else anon (RLS allows it).
  const supabase = getServiceSupabase() ?? getPublicServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`guestbook:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de messages, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  try {
    const row = await insertGuestbookMessage(supabase, {
      author: parsed.author?.trim() || "Anonyme",
      message: parsed.message.trim(),
    });
    return NextResponse.json({ message: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
