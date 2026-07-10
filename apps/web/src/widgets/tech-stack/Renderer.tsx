import type { WidgetRendererProps } from "../types";
import type { TechStackConfig } from "./schema";
import { TECHS } from "./techs";

// Badge grid of technologies. The tile is a size container (qrcode.css): the
// title hides on the smallest formats and the badges auto-fit, so 1x1 shows a
// tidy cluster while 3x2 shows the full labelled set.
export default function TechStackRenderer({ config }: WidgetRendererProps<TechStackConfig>) {
  const items = config.items.filter((k) => TECHS[k]);
  return (
    <div className="w-tech">
      {config.title && <span className="w-eyebrow w-tech__title">{config.title}</span>}
      <div className="w-tech__grid">
        {items.map((key) => {
          const t = TECHS[key];
          return (
            <span className="w-tech__badge" key={key} title={t.name}>
              <span className="w-tech__chip" style={{ background: t.bg, color: t.fg }} aria-hidden>
                {t.mono}
              </span>
              <span className="w-tech__name">{t.name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
