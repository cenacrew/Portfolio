import type { Breakpoint, WidgetBreakpointLayout, WidgetRow, WidgetSize, WidgetType } from "@portfolio/shared";
import { deleteWidget, GRID, reorderWidgets, updateWidget, upsertWidget } from "@portfolio/shared";
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

function id(row: WidgetRow) {
  return row.id;
}

// ---- photo upload ----------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = i + 2 < len ? B64.indexOf(clean[i + 2]) : -1;
    const c3 = i + 3 < len ? B64.indexOf(clean[i + 3]) : -1;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (c2 !== -1) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (c3 !== -1) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return out.subarray(0, p);
}

// Uploads a picked image (base64) to the widget-media bucket and returns its
// public URL.
export async function uploadImage(base64: string, mime = "image/jpeg"): Promise<string> {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `mobile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, base64ToBytes(base64), {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Max upload size for videos (~50 MB). Supabase free tier Storage is 1 GB.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Uploads a picked video (by local file URI) to the widget-media bucket and
// returns its public URL. Reads the file as an ArrayBuffer rather than base64
// so large clips don't blow up memory. Compatible with Expo Go.
export async function uploadVideo(uri: string, mime = "video/mp4"): Promise<string> {
  const res = await fetch(uri);
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error("Vidéo trop lourde (max 50 Mo). Choisis un clip plus court.");
  }
  const ext = mime.includes("quicktime") || mime.includes("mov") ? "mov" : mime.includes("webm") ? "webm" : "mp4";
  const path = `mobile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
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
