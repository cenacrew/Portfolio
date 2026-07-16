import { NextResponse } from "next/server";
import {
  getNotificationPrefs,
  getVisits,
  listAdminDevices,
  setVisitsDigestBaseline,
} from "@portfolio/shared";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily visits digest (phase 15). Triggered once a day by the Vercel cron
// declared in vercel.json. Sends the admin a summary of the visits since the
// previous run, but ONLY when the visits mode is "daily". The route is guarded
// by CRON_SECRET: Vercel cron requests carry `Authorization: Bearer <secret>`.
// If CRON_SECRET is unset the endpoint is disabled (401) rather than left open.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron non configuré." }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
  }

  try {
    const prefs = await getNotificationPrefs(supabase);
    const total = await getVisits(supabase);

    let sent = 0;
    if (prefs.visits_mode === "daily") {
      const delta = Math.max(0, total - prefs.visits_digest_last_count);
      if (delta > 0) {
        const devices = await listAdminDevices(supabase);
        const tokens = devices
          .map((d) => d.expo_push_token)
          .filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
        if (tokens.length > 0) {
          const body = tokens.map((to) => ({
            to,
            title: "📈 Résumé quotidien",
            body: `${delta.toLocaleString("fr-FR")} visite${delta > 1 ? "s" : ""} sur le dashboard depuis hier.`,
            sound: "default" as const,
          }));
          try {
            await fetch(EXPO_PUSH_URL, {
              method: "POST",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: JSON.stringify(body),
            });
            sent = tokens.length;
          } catch {
            // Best-effort; the baseline is still advanced below.
          }
        }
      }
    }

    // Advance the baseline every run (regardless of mode) so switching to
    // "daily" later reports only the visits from that point forward, not a
    // lifetime backlog.
    await setVisitsDigestBaseline(supabase, total);

    return NextResponse.json({ ok: true, mode: prefs.visits_mode, total, sent });
  } catch {
    return NextResponse.json({ error: "Digest impossible." }, { status: 500 });
  }
}
