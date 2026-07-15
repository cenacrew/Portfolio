import { loadPublicWidgets } from "@/widgets/load";
import WidgetTile from "./WidgetTile";
import RealtimeRefresh from "./RealtimeRefresh";
import type { DashboardScope } from "./dashboard";

// Server component: reads a version's widgets (Supabase, or local fallback for
// the default version). RealtimeRefresh is a tiny client child that re-fetches
// this server tree when the version's rows change.
export default async function BentoGrid({ scope }: { scope?: DashboardScope }) {
  const widgets = await loadPublicWidgets(scope);
  return (
    <>
      <RealtimeRefresh dashboardId={scope?.dashboardId ?? null} />
      <div className="qr-grid">
        {widgets.map((w, i) => (
          <WidgetTile key={w.id} widget={w} index={i} />
        ))}
      </div>
    </>
  );
}
