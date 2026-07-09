import type { WidgetRendererProps } from "../types";
import type { StatusConfig } from "./schema";

export default function StatusRenderer({ config }: WidgetRendererProps<StatusConfig>) {
  return (
    <div className="w-status">
      <div className="w-status__top">
        <span className="w-live" aria-hidden />
        <span className="w-eyebrow">En ce moment</span>
      </div>
      <p className="w-status__text">
        <span className="w-status__emoji" aria-hidden>
          {config.emoji}
        </span>
        {config.text}
      </p>
      {config.updated && <span className="w-status__meta">{config.updated}</span>}
    </div>
  );
}
