import { loadPublicWidgets } from "@/widgets/load";
import WidgetTile from "./WidgetTile";
import RealtimeRefresh from "./RealtimeRefresh";

// Server component: reads widgets (Supabase, or local fallback). RealtimeRefresh
// is a tiny client child that re-fetches this server tree when the DB changes.
export default async function BentoGrid() {
  const widgets = await loadPublicWidgets();
  return (
    <>
      <RealtimeRefresh />
      <div className="qr-grid">
        {widgets.map((w, i) => (
          <WidgetTile key={w.id} widget={w} index={i} />
        ))}
      </div>
    </>
  );
}
