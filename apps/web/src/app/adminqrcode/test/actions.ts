"use server";

import { revalidatePath } from "next/cache";
import type { WidgetQaBreakpoint, WidgetType } from "@portfolio/shared";
import { resetWidgetQa } from "@portfolio/shared";
import { getServerSupabase } from "@/lib/supabase/server";

// "Re-verify this widget" (phase 9, scoped by breakpoint in phase 18): clears
// the validated hash for every format of a type IN THE CURRENT CONTEXT so it
// flags as to-verify again on the next console load. Runs as the signed-in
// admin (RLS reserves widget_qa writes to authenticated).
export async function reVerifyAction(type: WidgetType, bp: WidgetQaBreakpoint): Promise<void> {
  const client = await getServerSupabase();
  if (!client) throw new Error("Supabase non configuré.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Session expirée.");
  const breakpoint: WidgetQaBreakpoint = bp === "mobile" ? "mobile" : "desktop";
  await resetWidgetQa(client, type, breakpoint);
  revalidatePath("/adminqrcode/test");
}
