import { extensionOf, fileKind, formatFileSize } from "@portfolio/shared";
import type { WidgetRendererProps } from "../types";
import type { FileDownloadConfig } from "./schema";

// Short label drawn inside the icon's band. Prefer the real extension (PDF,
// ZIP, DOCX…) so the tile shows exactly what will download; fall back to a
// family word when there's no extension.
const KIND_WORD: Record<string, string> = {
  pdf: "PDF",
  archive: "ZIP",
  image: "IMG",
  audio: "AUDIO",
  video: "VIDÉO",
  apk: "APK",
  doc: "DOC",
  sheet: "XLS",
  slides: "PPT",
  code: "CODE",
  text: "TXT",
  generic: "FILE",
};

function badge(fileName: string, mime: string): string {
  const ext = extensionOf(fileName);
  if (ext) return ext.slice(0, 4).toUpperCase();
  return KIND_WORD[fileKind(fileName, mime)] ?? "FILE";
}

// A document icon: rounded sheet, folded top-right corner, and a coloured band
// carrying the file's extension. The band colour comes from `data-kind` (CSS),
// so the same SVG reads as PDF / ZIP / APK… at a glance.
function FileGlyph({ tag }: { tag: string }) {
  return (
    <svg viewBox="0 0 40 48" className="w-file__svg" aria-hidden focusable="false">
      <path
        className="w-file__sheet"
        d="M6 3.5h20L36 13.5V42a2.5 2.5 0 0 1-2.5 2.5h-27A2.5 2.5 0 0 1 4 42V6a2.5 2.5 0 0 1 2-2.5Z"
      />
      <path className="w-file__fold" d="M26 3.5 36 13.5H28a2 2 0 0 1-2-2Z" />
      <rect className="w-file__band" x="7" y="28" width="26" height="12" rx="2.5" />
      <text className="w-file__tag" x="20" y="37" textAnchor="middle">
        {tag}
      </text>
    </svg>
  );
}

// Public download tile. A single click downloads the file (direct link to the
// public Storage URL + the `download` attribute). Adapts from a bare icon in a
// 1×1 tile up to icon + name + size + description in larger formats — handled by
// container queries in qrcode.css.
export default function FileDownloadRenderer({ config }: WidgetRendererProps<FileDownloadConfig>) {
  const kind = fileKind(config.fileName, config.mimeType);
  const tag = badge(config.fileName, config.mimeType);
  const title = config.label || config.fileName || "Fichier";
  const size = formatFileSize(config.sizeBytes);

  if (!config.fileUrl) {
    return (
      <div className="w-file w-file--empty" data-kind="generic">
        <span className="w-file__icon">
          <FileGlyph tag="—" />
        </span>
        <span className="w-file__body">
          <span className="w-file__name">Aucun fichier</span>
          <span className="w-file__meta">Importe un fichier depuis l’app</span>
        </span>
      </div>
    );
  }

  return (
    <a
      className="w-file"
      data-kind={kind}
      href={config.fileUrl}
      download={config.fileName || undefined}
      target="_blank"
      rel="noreferrer"
      title={`Télécharger ${config.fileName || title}`}
    >
      <span className="w-file__icon">
        <FileGlyph tag={tag} />
        <span className="w-file__dl" aria-hidden>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <span className="w-file__body">
        <span className="w-file__name">{title}</span>
        {config.description && <span className="w-file__desc">{config.description}</span>}
        <span className="w-file__meta">
          {size && <span className="w-file__size">{size}</span>}
          <span className="w-file__action">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Télécharger
          </span>
        </span>
      </span>
    </a>
  );
}
