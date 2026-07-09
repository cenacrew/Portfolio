import type { CSSProperties } from "react";
import type { Widget } from "@portfolio/shared";
import { registry } from "@/widgets/registry";
import { renderers } from "@/widgets/renderers";

export default function WidgetTile({
  widget,
  index,
}: {
  widget: Widget;
  index: number;
}) {
  const def = registry[widget.type];
  const Renderer = renderers[widget.type];
  const { mobile: m, desktop: d } = widget.layout;

  const style = {
    "--m-col": `${m.x + 1} / span ${m.w}`,
    "--m-row": `${m.y + 1} / span ${m.h}`,
    "--d-col": `${d.x + 1} / span ${d.w}`,
    "--d-row": `${d.y + 1} / span ${d.h}`,
    "--i": index,
  } as CSSProperties;

  return (
    <article
      className={`qr-tile${def.bleed ? " qr-tile--bleed" : ""}`}
      style={style}
      data-type={widget.type}
    >
      {/* Renderer may be a sync or async server component, or a client one. */}
      <Renderer config={widget.config} widget={widget} />
    </article>
  );
}
