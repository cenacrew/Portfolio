import type { Breakpoint, WidgetBreakpointLayout, WidgetRow, WidgetSize, WidgetType } from "@portfolio/shared";
import { deleteWidget, GRID, reorderWidgets, updateLayouts, updateWidget, upsertWidget } from "@portfolio/shared";
import { File } from "expo-file-system";
import { meta } from "./registry";
import { STORAGE_BUCKET, supabase } from "./supabase";

// All writes run through the authenticated user session (supabase client) and
// are enforced by RLS. No service-role key is ever present in the app.

function nextPosition(widgets: WidgetRow[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.position + 1), 0);
}

// New widget: placed at the bottom of each breakpoint (x:0, y:bottom), width
// clamped to the column count. Mirrors the web admin so the grid stays valid.
export async function addWidget(type: WidgetType, widgets: WidgetRow[]): Promise<WidgetRow> {
  const def = meta(type);
  const size = def.defaultSize;
  const bottom = (b: Breakpoint) => widgets.reduce((max, w) => Math.max(max, w.layout[b].y + w.layout[b].h), 0);
  const sized = (b: Breakpoint) => ({ x: 0, y: bottom(b), w: Math.min(size.w, GRID[b].columns), h: size.h });
  const layout: WidgetBreakpointLayout = { mobile: sized("mobile"), desktop: sized("desktop") };
  return upsertWidget(supabase, {
    type,
    config: def.defaultConfig,
    layout,
    visible: true,
    position: nextPosition(widgets),
  });
}

export async function saveConfig(id: string, config: unknown): Promise<WidgetRow> {
  return updateWidget(supabase, id, { config });
}

export async function setVisible(id: string, visible: boolean): Promise<WidgetRow> {
  return updateWidget(supabase, id, { visible });
}

export async function deleteW(id: string): Promise<void> {
  return deleteWidget(supabase, id);
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

// Reads a picked local file (file:// URI) into bytes with expo-file-system.
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

// Guard: the number of bytes we actually read must be plausible and, when the
// picker told us the file size, must match it. Anything off → throw a clear
// message and DO NOT upload (no more silent 14-byte corruption).
function assertReadOk(read: number, expectedSize: number | undefined, kind: "image" | "vidéo"): void {
  if (read < 64) {
    throw new Error(`La ${kind} n'a pas pu être lue (fichier vide). Réessaie ou choisis-en une autre.`);
  }
  if (expectedSize && expectedSize > 0) {
    const drift = Math.abs(read - expectedSize);
    // Allow a tiny tolerance for metadata rounding; anything larger is a bad read.
    if (drift > Math.max(1024, expectedSize * 0.02)) {
      throw new Error(`La ${kind} lue ne correspond pas au fichier choisi (${read} / ${expectedSize} octets). Import annulé.`);
    }
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
