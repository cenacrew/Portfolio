"use server";

import { revalidatePath } from "next/cache";
import type { WidgetType } from "@portfolio/shared";
import { resetWidgetQa } from "@portfolio/shared";
import { getServerSupabase } from "@/lib/supabase/server";

// "Re-verify this widget" (phase 9): clears the validated hash for every format
// of a type so it flags as to-verify again on the next console load. Runs as the
// signed-in admin (RLS reserves widget_qa writes to authenticated).
export async function reVerifyAction(type: WidgetType): Promise<void> {
  const client = await getServerSupabase();
  if (!client) throw new Error("Supabase non configuré.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Session expirée.");
  await resetWidgetQa(client, type);
  revalidatePath("/adminqrcode/test");
}
