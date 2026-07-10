import { Fragment, type ReactNode } from "react";
import type { WidgetRendererProps } from "../types";
import type { NoteConfig } from "./schema";

// Minimal, safe inline markdown: **bold**, *italic*, and line breaks.
// Builds React nodes directly (no dangerouslySetInnerHTML).
function renderInline(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.flatMap((line, li) => {
    const parts: ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      const token = match[0];
      if (token.startsWith("**")) {
        parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
      } else {
        parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
      }
      last = match.index + token.length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <Fragment key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </Fragment>
    );
  });
}

export default function NoteRenderer({ config }: WidgetRendererProps<NoteConfig>) {
  return (
    <div className={`w-note w-note--${config.tone}`}>
      <span className="w-note__quote" aria-hidden>&ldquo;</span>
      <p className="w-note__text">{renderInline(config.text)}</p>
      {config.signature && (
        <span className="w-note__sign">— {config.signature}</span>
      )}
    </div>
  );
}
