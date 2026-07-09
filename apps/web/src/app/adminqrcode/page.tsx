import type { ReactNode } from "react";
import { getGuestbookMessages, type GuestbookRow } from "@portfolio/shared";
import { loadAdminWidgets } from "@/widgets/load";
import { renderers } from "@/widgets/renderers";
import { getServerSupabase } from "@/lib/supabase/server";
import AdminBoard from "./AdminBoard";

export const dynamic = "force-dynamic";

// Server component: loads all widgets (incl. hidden), pre-renders each widget's
// live preview server-side, and hands them plus the guestbook to the client
// board. Rendering the (possibly async) renderers here keeps the editable grid
// pixel-identical to the public one.
export default async function AdminPage() {
  const widgets = await loadAdminWidgets();

  const previews: Record<string, ReactNode> = {};
  for (const w of widgets) {
    const Renderer = renderers[w.type];
    previews[w.id] = <Renderer config={w.config} widget={w} />;
  }

  let messages: GuestbookRow[] = [];
  const supabase = await getServerSupabase();
  if (supabase) {
    try {
      messages = await getGuestbookMessages(supabase, 100);
    } catch {
      /* keep empty */
    }
  }

  return <AdminBoard initialWidgets={widgets} previews={previews} messages={messages} />;
}
