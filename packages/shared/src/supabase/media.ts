// Storage hygiene shared by the web admin and the mobile app (phase 7 B).
//
// Root cause of orphaned files: deleting a media-referencing widget (photo,
// video, file-download, toile) — or replacing its media in the editor — left
// the underlying object in the widget-media bucket forever. These helpers make
// every delete/replace prune the now-unreferenced object, with a cross-widget
// guard so a file still used by ANOTHER widget is never removed (this matters
// from phase 8 on, where duplicating a dashboard shares media).
import type { DbClient } from "./client";
import type { WidgetType } from "../widget";
import { WIDGET_MEDIA_SPECS, MEDIA_TYPES } from "../widget-configs/media";

export const WIDGET_MEDIA_BUCKET = "widget-media";

// The minimal widget shape these helpers need.
export interface MediaWidget {
  id: string;
  type: WidgetType;
  config: unknown;
}

// Turn a public Storage URL into its object path inside the bucket, or null if
// the URL doesn't point at this bucket (external URLs, local /files paths…).
export function storagePathFromPublicUrl(url: string): string | null {
  if (typeof url !== "string" || !url) return null;
  const marker = `/storage/v1/object/public/${WIDGET_MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  let path = url.slice(i + marker.length);
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw path if it isn't valid percent-encoding */
  }
  return path || null;
}

// Every bucket object path a widget's config references, driven by the widget's
// media spec (packages/shared/src/widget-configs/media.ts). URL media is
// resolved from its public URL; id-keyed media (the toile PNG) uses the widget
// id. A type with no spec references no media. Archives (toile/archive/*) are
// intentional and never pruned here (nor by the purge script).
export function extractMediaPaths(widget: MediaWidget): string[] {
  const spec = WIDGET_MEDIA_SPECS[widget.type];
  if (!spec) return [];
  const paths = new Set<string>();
  if (spec.urls) {
    for (const url of spec.urls(widget.config)) {
      const p = storagePathFromPublicUrl(url ?? "");
      if (p) paths.add(p);
    }
  }
  if (spec.idKeyedPath) paths.add(spec.idKeyedPath(widget.id));
  return [...paths];
}

// Copies a widget's id-keyed media (e.g. the toile PNG) to a freshly duplicated
// widget's id, when its spec asks for it. Best-effort: a failure just leaves the
// duplicate's media blank, never fails the duplication.
export async function copyDuplicatedMedia(
  client: DbClient,
  type: WidgetType,
  sourceId: string,
  newId: string,
): Promise<void> {
  const spec = WIDGET_MEDIA_SPECS[type];
  if (!spec?.copyOnDuplicate || !spec.idKeyedPath) return;
  try {
    await client.storage
      .from(WIDGET_MEDIA_BUCKET)
      .copy(spec.idKeyedPath(sourceId), spec.idKeyedPath(newId));
  } catch {
    /* the duplicate just starts blank */
  }
}

// All bucket paths referenced by any widget in the list (the cross-widget guard
// set). A path in here must never be deleted.
export function referencedMediaPaths(widgets: MediaWidget[]): Set<string> {
  const set = new Set<string>();
  for (const w of widgets) for (const p of extractMediaPaths(w)) set.add(p);
  return set;
}

// Delete candidate paths that no widget in `remaining` still references.
// Returns the paths actually removed. Never throws for a missing object.
export async function pruneMedia(
  client: DbClient,
  candidatePaths: string[],
  remaining: MediaWidget[],
): Promise<string[]> {
  const kept = referencedMediaPaths(remaining);
  const toRemove = [...new Set(candidatePaths)].filter((p) => p && !kept.has(p));
  if (toRemove.length === 0) return [];
  const { error } = await client.storage.from(WIDGET_MEDIA_BUCKET).remove(toRemove);
  if (error) throw error;
  return toRemove;
}

// Convenience used after a delete/update write: reads the CURRENT widgets from
// the DB (post-write state) and prunes any candidate path now unreferenced.
// Best-effort — callers wrap it so a storage hiccup never fails the primary
// action (the widget row change already succeeded).
export async function pruneWidgetMedia(client: DbClient, candidatePaths: string[]): Promise<string[]> {
  if (candidatePaths.length === 0) return [];
  // Only media-bearing types can hold a referenced path, so scan just those
  // rows instead of the whole widgets table.
  const { data } = await client.from("widgets").select("id,type,config").in("type", MEDIA_TYPES);
  const remaining = (data ?? []) as MediaWidget[];
  return pruneMedia(client, candidatePaths, remaining);
}
