import type { ReactNode } from "react";
import { getGuestbookMessages, listDashboards, type DashboardRow, type GuestbookRow } from "@portfolio/shared";
import { loadAdminWidgets } from "@/widgets/load";
import { renderers } from "@/widgets/renderers";
import { getServerSupabase } from "@/lib/supabase/server";
import AdminBoard from "./AdminBoard";

export const dynamic = "force-dynamic";

// Server component: resolves the selected version (?d=<slug>, default otherwise),
// loads that version's widgets (incl. hidden), pre-renders each widget's live
// preview server-side, and hands them plus the guestbook and version list to the
// client board. Rendering the renderers here keeps the editable grid
// pixel-identical to the public one.
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const supabase = await getServerSupabase();

  let dashboards: DashboardRow[] = [];
  if (supabase) {
    try {
      dashboards = await listDashboards(supabase);
    } catch {
      /* keep empty — the board still works unscoped */
    }
  }

  const selected =
    dashboards.find((x) => x.slug === d) ?? dashboards.find((x) => x.is_default) ?? dashboards[0] ?? null;
  const dashboardId = selected?.id || null; // "" (legacy) → null (unscoped)

  const widgets = await loadAdminWidgets(dashboardId);

  const previews: Record<string, ReactNode> = {};
  for (const w of widgets) {
    const Renderer = renderers[w.type];
    previews[w.id] = <Renderer config={w.config} widget={w} />;
  }

  let messages: GuestbookRow[] = [];
  if (supabase) {
    try {
      messages = await getGuestbookMessages(supabase, 100);
    } catch {
      /* keep empty */
    }
  }

  return (
    <AdminBoard
      key={selected?.slug ?? "default"}
      initialWidgets={widgets}
      previews={previews}
      messages={messages}
      dashboards={dashboards}
      selectedSlug={selected?.slug ?? "default"}
      dashboardId={dashboardId}
    />
  );
}
