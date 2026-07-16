import { NextResponse } from "next/server";
import {
  getNotificationPrefs,
  getVisits,
  listAdminDevices,
  setVisitsDigestBaseline,
} from "@portfolio/shared";
import { getServiceSupabase } from "@/lib/supabase/server";
import { sendExpoPush } from "@/app/api/_lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily visits digest (phase 15). Triggered once a day by the Vercel cron
// declared in vercel.json. Sends the admin a summary of the visits since the
// previous run, but ONLY when the visits mode is "daily". The route is guarded
// by CRON_SECRET: Vercel cron requests carry `Authorization: Bearer <secret>`.
// If CRON_SECRET is unset the endpoint is disabled (401) rather than left open.

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
    // Whether it is safe to advance the visits baseline this run. Stays true for
    // every "nothing to send" case (mode ≠ daily, delta = 0, no devices) and
    // only turns false when a send was attempted but failed — so a failed digest
    // keeps the day's visits for the next run instead of dropping them.
    let baselineOk = true;

    if (prefs.visits_mode === "daily") {
      const delta = Math.max(0, total - prefs.visits_digest_last_count);
      if (delta > 0) {
        const devices = await listAdminDevices(supabase);
        const tokens = devices
          .map((d) => d.expo_push_token)
          .filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
        if (tokens.length > 0) {
          const result = await sendExpoPush(tokens, {
            title: "📈 Résumé quotidien",
            body: `${delta.toLocaleString("fr-FR")} visite${delta > 1 ? "s" : ""} sur le dashboard depuis hier.`,
          });
          sent = result.sent;
          baselineOk = result.ok;
        }
      }
    }

    // Advance the baseline (regardless of mode) so switching to "daily" later
    // reports only the visits from that point forward, not a lifetime backlog —
    // but NOT when a send failed, so those visits are retried next run.
    if (baselineOk) await setVisitsDigestBaseline(supabase, total);

    return NextResponse.json({ ok: true, mode: prefs.visits_mode, total, sent, baselineAdvanced: baselineOk });
  } catch {
    return NextResponse.json({ error: "Digest impossible." }, { status: 500 });
  }
}
