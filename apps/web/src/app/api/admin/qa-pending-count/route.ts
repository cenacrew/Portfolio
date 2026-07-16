import { NextResponse } from "next/server";
import { getWidgetQaMap } from "@portfolio/shared";
import { getBearerSupabase, getServerSupabase } from "@/lib/supabase/server";
import { buildQaPlan, totalToVerify } from "@/widgets/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/qa-pending-count — number of (type, format, breakpoint)
// triples still "to verify" in the QA console (phase 14 badge on the app's
// "Test widgets" entry). Since phase 18 the console is scoped per breakpoint;
// the badge counts the SUM of both contexts so nothing pending is hidden.
//
// Auth: the mobile app carries a Supabase session as a Bearer JWT; the web
// admin carries it as cookies. Accept either, verify server-side, and NEVER
// expose this count to an unauthenticated caller (no anonymous read, no service
// role on the client). The count itself crosses the build-time qa-manifest with
// the widget_qa table (auth-only read) exactly like the QA console does.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer =
    authHeader && /^bearer\s+/i.test(authHeader) ? authHeader.replace(/^bearer\s+/i, "").trim() : null;

  let client;
  if (bearer) {
    client = getBearerSupabase(bearer);
    if (!client) return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
    // Verify the token before trusting the session-bound client.
    const {
      data: { user },
      error,
    } = await client.auth.getUser(bearer);
    if (error || !user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  } else {
    client = await getServerSupabase();
    if (!client) return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let count = 0;
  try {
    const [mobileMap, desktopMap] = await Promise.all([
      getWidgetQaMap(client, "mobile"),
      getWidgetQaMap(client, "desktop"),
    ]);
    count =
      totalToVerify(buildQaPlan(mobileMap, "mobile", true)) +
      totalToVerify(buildQaPlan(desktopMap, "desktop", true));
  } catch {
    // Pre-migration or a transient read failure: report nothing pending rather
    // than erroring the badge.
    count = 0;
  }

  return NextResponse.json({ count });
}
