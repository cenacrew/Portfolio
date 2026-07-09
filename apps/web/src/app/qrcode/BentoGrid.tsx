import { loadWidgets } from "@/widgets/load";
import WidgetTile from "./WidgetTile";

export default function BentoGrid() {
  const widgets = loadWidgets();
  return (
    <div className="qr-grid">
      {widgets.map((w, i) => (
        <WidgetTile key={w.id} widget={w} index={i} />
      ))}
    </div>
  );
}
