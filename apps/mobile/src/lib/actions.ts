import type { Breakpoint, WidgetBreakpointLayout, WidgetRow, WidgetSize, WidgetType } from "@portfolio/shared";
import {
  deleteWidget,
  duplicateWidget,
  extractMediaPaths,
  extensionOf,
  GRID,
  MAX_FILE_BYTES,
  type MediaWidget,
  pruneWidgetMedia,
  reorderWidgets,
  toileArchivePath,
  toilePath,
  toilePublicUrl,
  toileSchema,
  updateLayouts,
  updateWidget,
  upsertWidget,
} from "@portfolio/shared";
import { File } from "expo-file-system";
import { meta } from "./registry";
import { STORAGE_BUCKET, SUPABASE_URL, supabase } from "./supabase";

// All writes run through the authenticated user session (supabase client) and
// are enforced by RLS. No service-role key is ever present in the app.

function nextPosition(widgets: WidgetRow[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.position + 1), 0);
}

// New widget: placed at the bottom of each breakpoint (x:0, y:bottom), width
// clamped to the column count. Mirrors the web admin so the grid stays valid.
// Stamped with the current version (dashboardId) when known; a falsy id (legacy)
// omits dashboard_id so pre-migration inserts still work.
export async function addWidget(
  type: WidgetType,
  widgets: WidgetRow[],
  dashboardId?: string | null,
): Promise<WidgetRow> {
  const def = meta(type);
  const size = def.defaultSize;
  // Guard legacy rows missing a breakpoint layout so adding never throws
  // "Cannot read property 'x'/'y' of undefined" (phase 4.8 C3).
  const bottom = (b: Breakpoint) =>
    widgets.reduce((max, w) => {
      const l = w.layout?.[b];
      return l ? Math.max(max, l.y + l.h) : max;
    }, 0);
  const sized = (b: Breakpoint) => ({ x: 0, y: bottom(b), w: Math.min(size.w, GRID[b].columns), h: size.h });
  const layout: WidgetBreakpointLayout = { mobile: sized("mobile"), desktop: sized("desktop") };
  return upsertWidget(supabase, {
    type,
    config: def.defaultConfig,
    layout,
    visible: true,
    position: nextPosition(widgets),
    ...(dashboardId ? { dashboard_id: dashboardId } : {}),
  });
}

// Saves a widget's config, then prunes any media the OLD config referenced but
// the new one no longer does (a replaced photo/video/file), unless another
// widget still uses it. Best-effort cleanup — never blocks the save.
export async function saveConfig(id: string, config: unknown): Promise<WidgetRow> {
  const { data: old } = await supabase.from("widgets").select("id,type,config").eq("id", id).maybeSingle();
  const updated = await updateWidget(supabase, id, { config });
  if (old) {
    try {
      await pruneWidgetMedia(supabase, extractMediaPaths(old as MediaWidget));
    } catch {
      /* storage cleanup is best-effort; the config was saved */
    }
  }
  return updated;
}

export async function setVisible(id: string, visible: boolean): Promise<WidgetRow> {
  return updateWidget(supabase, id, { visible });
}

// Deletes a widget, then removes its media from the bucket if no other widget
// references it (phase 7 B). Best-effort cleanup — the widget is gone either way.
export async function deleteW(id: string): Promise<void> {
  const { data } = await supabase.from("widgets").select("id,type,config").eq("id", id).maybeSingle();
  const removed = data as MediaWidget | null;
  await deleteWidget(supabase, id);
  if (removed) {
    try {
      await pruneWidgetMedia(supabase, extractMediaPaths(removed));
    } catch {
      /* storage cleanup is best-effort; the widget row is already deleted */
    }
  }
}

// Duplicates a widget in place: same config + sizes, dropped at the first free
// grid slot via the shared resolver, same version, shared media (phase 11).
export async function duplicateW(id: string): Promise<WidgetRow> {
  return duplicateWidget(supabase, id);
}

// Change a widget's size for one breakpoint, clamping width to the columns and
// keeping its x within bounds.
export async function setSize(row: WidgetRow, bp: Breakpoint, size: WidgetSize): Promise<WidgetRow> {
  const cols = GRID[bp].columns;
  const w = Math.min(size.w, cols);
  const cur = row.layout[bp];
  const x = Math.min(cur.x, cols - w);
  const next: WidgetBreakpointLayout = { ...row.layout, [bp]: { x: Math.max(0, x), y: cur.y, w, h: size.h } };
  return updateWidget(supabase, id(row), { layout: next });
}

export async function persistOrder(order: { id: string; position: number }[]): Promise<void> {
  return reorderWidgets(supabase, order);
}

// Batch-write new layouts for the widgets moved on the drag grid (phase 4.6).
// Only the widgets that actually changed are passed, in a single pass.
export async function persistLayouts(changes: { id: string; layout: WidgetBreakpointLayout }[]): Promise<void> {
  return updateLayouts(supabase, changes);
}

function id(row: WidgetRow) {
  return row.id;
}

// ---- media upload ----------------------------------------------------------

// Reads a picked file into bytes with expo-file-system. Handles both the
// scoped file:// uris that expo-image-picker returns (photos/videos, copied
// into the experience sandbox) and the content:// SAF uris from
// expo-document-picker (see PickFileButton) — the new File API grants READ for
// content:// and streams them through Android's ContentResolver.
//
// THE BUG (phase 4.6): RN's `fetch(uri).arrayBuffer()` returns a truncated
// 14-byte body for local file:// URIs in Expo Go, so uploaded videos landed in
// the bucket corrupted. expo-file-system reads the real bytes off disk. Returns
// the on-disk size too so callers can sanity-check the read.
async function readLocalFile(uri: string): Promise<{ bytes: Uint8Array; size: number }> {
  const file = new File(uri);
  const bytes = await file.bytes();
  const size = typeof file.size === "number" ? file.size : bytes.byteLength;
  return { bytes, size };
}

// Guard against the original 14-byte truncated read (phase 4.6). The only
// reliable signal is a near-empty read: reject anything under ~4 KB (phase 4.10
// B3). We do NOT compare to the picker's reported size for images — Android
// recompresses on import, so a legitimate read is often much smaller than the
// picked file (e.g. 263832 / 812361 bytes) and that must not be rejected.
const MIN_READ_BYTES = 4 * 1024;

function assertReadOk(read: number, expectedSize: number | undefined, kind: "image" | "vidéo"): void {
  if (read < MIN_READ_BYTES) {
    throw new Error(`La ${kind} n'a pas pu être lue (fichier vide). Réessaie ou choisis-en une autre.`);
  }
  // Picker-size comparison kept only for videos, and only to catch a read that
  // is drastically SMALLER than the picked file (a truncated read); a moderate
  // shrink from recompression is allowed.
  if (kind === "vidéo" && expectedSize && expectedSize > MIN_READ_BYTES && read < expectedSize * 0.25) {
    throw new Error(`La ${kind} lue semble tronquée (${read} / ${expectedSize} octets). Import annulé.`);
  }
}

// Uploads a picked image (local URI) to the widget-media bucket and returns its
// public URL. Same read path as video so a truncated read is impossible.
export async function uploadImage(uri: string, mime = "image/jpeg", expectedSize?: number): Promise<string> {
  const { bytes, size } = await readLocalFile(uri);
  assertReadOk(bytes.byteLength, expectedSize ?? size, "image");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `mobile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Max upload size for videos (~50 MB). Supabase free tier Storage is 1 GB.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Uploads a picked video (local file URI) to the widget-media bucket and returns
// its public URL. Reads real bytes with expo-file-system (see readLocalFile) and
// refuses to upload a read that doesn't match the picked file's size.
export async function uploadVideo(uri: string, mime = "video/mp4", expectedSize?: number): Promise<string> {
  const { bytes, size } = await readLocalFile(uri);
  assertReadOk(bytes.byteLength, expectedSize ?? size, "vidéo");
  if (bytes.byteLength > MAX_VIDEO_BYTES) {
    throw new Error("Vidéo trop lourde (max 50 Mo). Choisis un clip plus court.");
  }
  const ext = mime.includes("quicktime") || mime.includes("mov") ? "mov" : mime.includes("webm") ? "webm" : "mp4";
  const path = `mobile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Uploads a picked document (any type, ~50 MB max) to the widget-media bucket
// under the `files/` prefix and returns its public URL + the real byte size.
// Reads real bytes with expo-file-system (see readLocalFile) — never fetch(uri),
// which truncates local file:// reads in Expo Go (phase 4.6 bug).
export async function uploadFile(
  uri: string,
  fileName: string,
  mime = "application/octet-stream",
): Promise<{ url: string; sizeBytes: number }> {
  const { bytes } = await readLocalFile(uri);
  if (bytes.byteLength === 0) {
    throw new Error("Le fichier n'a pas pu être lu (vide). Réessaie ou choisis-en un autre.");
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("Fichier trop lourd (max 50 Mo). Choisis un fichier plus léger.");
  }
  const rawExt = extensionOf(fileName);
  const ext = rawExt ? rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 8) : "bin";
  const path = `files/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: mime || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, sizeBytes: bytes.byteLength };
}

// A tiny opaque-white PNG. Uploaded to the toile bucket on reset; the tile and
// modal scale it to fill, so the canvas reads as a blank white sheet.
const BLANK_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADklEQVR4nGP4DwYMEAoAU7oL9ZisIGcAAAAASUVORK5CYII=";

function b64ToBytes(b64: string): Uint8Array {
  // atob is a global in Hermes (RN 0.74+ / Expo SDK 57).
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Reset the collaborative canvas (phase 4.8 A7, admin). Archives the current
// PNG to toile/archive/ first, then overwrites the toile with a blank sheet and
// bumps the widget's config.version so the public tile refreshes.
export async function resetToile(row: WidgetRow): Promise<void> {
  // 1) Archive the current image (best-effort — skip if it doesn't exist yet).
  try {
    const res = await fetch(toilePublicUrl(SUPABASE_URL, row.id, Date.now()), { cache: "no-store" as RequestCache });
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > 8) {
        await supabase.storage.from(STORAGE_BUCKET).upload(toileArchivePath(row.id), buf, { contentType: "image/png", upsert: false });
      }
    }
  } catch {
    // No existing image to archive; carry on.
  }
  // 2) Overwrite with a blank sheet.
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(toilePath(row.id), b64ToBytes(BLANK_PNG_B64), {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  // 3) Bump version so the public <img> cache-busts.
  const cfg = toileSchema.safeParse(row.config);
  const version = (cfg.success ? cfg.data.version : 0) + 1;
  const next = cfg.success ? { ...cfg.data, version } : { title: "La toile", subtitle: "Laisse ta trace", version };
  await updateWidget(supabase, row.id, { config: next });
}

// Posts an image: appends to the first photo widget if one exists, otherwise
// creates a new photo widget with it.
export async function postPhoto(publicUrl: string, widgets: WidgetRow[]): Promise<WidgetRow> {
  const existing = widgets.find((w) => w.type === "photo");
  if (existing) {
    const cfg = (existing.config && typeof existing.config === "object" ? existing.config : {}) as { images?: any[] };
    const images = [...(cfg.images ?? []), { src: publicUrl, alt: "" }];
    return updateWidget(supabase, existing.id, { config: { ...cfg, images } });
  }
  const created = await addWidget("photo", widgets);
  return updateWidget(supabase, created.id, { config: { images: [{ src: publicUrl, alt: "" }] } });
}
