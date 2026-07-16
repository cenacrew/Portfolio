import { z } from "zod";

// A downloadable file tile. The file is uploaded to the widget-media bucket
// (prefix `files/`) from the mobile admin via expo-document-picker; the config
// only carries what the public tile needs to render + link to it.
//
// Any file type is accepted, capped at 50 MB (guarded in the app AND on the
// server upload route — the free-tier bucket is 1 GB total).
export const fileDownloadSchema = z.object({
  // Public Storage URL of the uploaded file. Empty until a file is picked.
  fileUrl: z.string().default(""),
  // Original file name (shown on the tile, used for the download attribute).
  fileName: z.string().default(""),
  // Size in bytes, for the human-readable size shown on the tile.
  sizeBytes: z.number().int().nonnegative().default(0),
  // MIME type reported at upload (used as a fallback for the icon).
  mimeType: z.string().default(""),
  // Optional title shown instead of the raw file name.
  label: z.string().optional(),
  // Optional one-line description shown on roomier tiles.
  description: z.string().optional(),
});

export type FileDownloadConfig = z.infer<typeof fileDownloadSchema>;

export const fileDownloadDefault: FileDownloadConfig = {
  fileUrl: "",
  fileName: "",
  sizeBytes: 0,
  mimeType: "",
};

export const fileDownloadLabel = "Fichier à télécharger";

import type { WidgetMediaSpec } from "./media-spec";

// Media: the single uploaded file.
export const fileDownloadMedia: WidgetMediaSpec = {
  urls: (config) => [(config as Partial<FileDownloadConfig>)?.fileUrl],
};

// Max upload size (~50 MB). Enforced in the mobile app before upload AND on the
// server upload route so a hand-crafted request can't bypass it.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

// Human-readable size: "820 Ko", "12,4 Mo" (French units, comma decimal).
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} Ko`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace(".", ",")} Mo`;
  const gb = mb / 1024;
  return `${gb.toFixed(1).replace(".", ",")} Go`;
}

// The visual family a file belongs to — drives the icon glyph + accent colour.
// Kept deliberately small so every kind has a hand-made icon.
export type FileKind =
  | "pdf"
  | "archive"
  | "image"
  | "audio"
  | "video"
  | "apk"
  | "doc"
  | "sheet"
  | "slides"
  | "code"
  | "text"
  | "generic";

const EXT_KIND: Record<string, FileKind> = {
  pdf: "pdf",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive", tgz: "archive",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", heic: "image", bmp: "image",
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio", m4a: "audio",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video", m4v: "video",
  apk: "apk", aab: "apk",
  doc: "doc", docx: "doc", odt: "doc", rtf: "doc", pages: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet", ods: "sheet", numbers: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
  js: "code", ts: "code", json: "code", html: "code", css: "code", py: "code", sh: "code", xml: "code", yml: "code", yaml: "code",
  txt: "text", md: "text", log: "text",
};

export function extensionOf(fileName: string): string {
  const clean = fileName.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  if (dot < 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
}

// Resolve a file to its visual kind from its name first, then its MIME type.
export function fileKind(fileName: string, mimeType = ""): FileKind {
  const ext = extensionOf(fileName);
  if (ext && EXT_KIND[ext]) return EXT_KIND[ext];
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("tar")) return "archive";
  if (mimeType.includes("vnd.android")) return "apk";
  if (mimeType.startsWith("text/")) return "text";
  return "generic";
}
