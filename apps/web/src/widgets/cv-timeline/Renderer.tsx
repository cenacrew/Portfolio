/* eslint-disable @next/next/no-img-element */
import type { WidgetRendererProps } from "../types";
import type { CvTimelineConfig } from "./schema";

// A vertical career timeline. Entries hang off a single rail, newest first; the
// tile shows as many as fit its format (extra entries clip cleanly, like the
// Letterboxd tile) and a "+N" chip hints at the rest. No overflow, ever —
// handled by container queries in qrcode.css.
export default function CvTimelineRenderer({ config }: WidgetRendererProps<CvTimelineConfig>) {
  const entries = config.entries;

  return (
    <div className="w-cv">
      <div className="w-cv__head">
        <span className="w-eyebrow">{config.title}</span>
      </div>

      {entries.length === 0 ? (
        <p className="w-cv__empty">Aucune entrée pour l’instant.</p>
      ) : (
        <ol className="w-cv__list">
          {entries.map((e) => (
            <li className="w-cv__item" key={e.id}>
              <span className="w-cv__node" aria-hidden>
                {e.logoUrl ? <img className="w-cv__logo" src={e.logoUrl} alt="" loading="lazy" /> : null}
              </span>
              <span className="w-cv__body">
                <span className="w-cv__period">{e.period}</span>
                <span className="w-cv__title">{e.title}</span>
                {e.place ? <span className="w-cv__place">{e.place}</span> : null}
                {e.description ? <span className="w-cv__desc">{e.description}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
