/* eslint-disable @next/next/no-img-element */
import type { WidgetRendererProps } from "../types";
import type { WatchlistConfig, WatchlistItem } from "./schema";

const STATUS: Record<WatchlistItem["status"], string> = {
  watching: "En cours",
  done: "Terminé",
  plan: "À voir",
};

export default function WatchlistRenderer({
  config,
}: WidgetRendererProps<WatchlistConfig>) {
  return (
    <div className="w-watch">
      <div className="w-watch__head">
        <span className="w-eyebrow">{config.title}</span>
        <span aria-hidden>🍿</span>
      </div>
      <ul className="w-watch__list">
        {config.items.map((it, i) => {
          const pct =
            it.current !== undefined && it.total
              ? Math.round((it.current / it.total) * 100)
              : null;
          return (
            <li key={i} className="w-watch__item">
              {it.poster ? (
                <img className="w-watch__poster" src={it.poster} alt="" />
              ) : (
                <span
                  className="w-watch__poster w-watch__poster--ph"
                  style={{ background: it.accent ?? "var(--qr-ink)" }}
                  aria-hidden
                >
                  {it.title.charAt(0)}
                </span>
              )}
              <div className="w-watch__meta">
                <span className="w-watch__title">{it.title}</span>
                <span className={`w-watch__status w-watch__status--${it.status}`}>
                  {STATUS[it.status]}
                  {it.current !== undefined && it.total
                    ? ` · ${it.current}/${it.total}`
                    : ""}
                </span>
                {pct !== null && (
                  <span className="w-watch__bar">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
