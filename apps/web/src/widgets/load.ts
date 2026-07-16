import "server-only";
import type { Breakpoint, SiteSettingsRow, Widget, WidgetRow } from "@portfolio/shared";
import { GRID, getSiteSettings, getWidgets, isCountdownHiddenNow, resolveCollisions } from "@portfolio/shared";
import { widgets as localWidgets } from "@/config/widgets.config";
import { getPublicServerSupabase, getServerSupabase } from "@/lib/supabase/server";
import { registry } from "./registry";

// Presence (phase 4.8 C1): when the admin's device reported a location, the
// weather widget and any "ma-loc" map follow it live. Their own config stays as
// the fallback when presence is absent. Applied at load so client renderers stay
// unchanged and only ever see a plain config.
function applyPresence(widgets: Widget[], presence: SiteSettingsRow | null): Widget[] {
  const lat = presence?.lat;
  const lng = presence?.lng;
  if (presence == null || typeof lat !== "number" || typeof lng !== "number") return widgets;
  const city = presence.city || undefined;
  return widgets.map((w) => {
    if (w.type === "weather") {
      return { ...w, config: { ...(w.config as object), lat, lng, ...(city ? { city } : {}) } };
    }
    if (w.type === "location-map" && (w.config as { mode?: string }).mode === "ma-loc") {
      return { ...w, config: { ...(w.config as object), lat, lng, ...(city ? { city } : {}) } };
    }
    return w;
  });
}

// Defensive anti-overlap (phase 4.6): whatever the DB holds, never render two
// tiles on top of each other. We re-pack each breakpoint deterministically
// (tiles keep their spot unless forced to move, conflicts pushed down) so a bad
// row can't reproduce the weather-over-status overlap from the user's report.
function deoverlap(widgets: Widget[]): Widget[] {
  const bps: Breakpoint[] = ["mobile", "desktop"];
  const fixed = new Map<string, Widget["layout"]>();
  for (const w of widgets) fixed.set(w.id, { ...w.layout });
  for (const bp of bps) {
    const rects = widgets.map((w) => ({ id: w.id, ...w.layout[bp] }));
    const packed = resolveCollisions(rects, GRID[bp].columns);
    for (const r of packed) {
      const layout = fixed.get(r.id)!;
      layout[bp] = { x: r.x, y: r.y, w: r.w, h: r.h };
    }
  }
  return widgets.map((w) => ({ ...w, layout: fixed.get(w.id)! }));
}

// Drops countdowns configured to hide once reached (phase 11). Only affects the
// PUBLIC render — the admin loader keeps them so they stay visible/editable.
// Runs before de-overlap so the freed grid slot is repacked cleanly.
function dropReachedHiddenCountdowns(widgets: Widget[]): Widget[] {
  const now = Date.now();
  return widgets.filter(
    (w) => w.type !== "countdown" || !isCountdownHiddenNow(w.config as { endBehavior?: string; target?: string }, now),
  );
}

// Validates a widget's config with its type schema; returns null if the type
// is unknown or the config is invalid, so one bad DB row can't blank the page.
function parseWidget(row: {
  id: string;
  type: Widget["type"];
  config: unknown;
  layout: Widget["layout"];
  visible: boolean;
  position: number;
  createdAt: string;
}): Widget | null {
  const def = registry[row.type];
  if (!def) return null;
  const parsed = def.schema.safeParse(row.config);
  if (!parsed.success) return null;
  return { ...row, config: parsed.data };
}

function fromRow(row: WidgetRow): Parameters<typeof parseWidget>[0] {
  return {
    id: row.id,
    type: row.type,
    config: row.config,
    layout: row.layout,
    visible: row.visible,
    position: row.position,
    createdAt: row.created_at,
  };
}

// Fallback: the phase-2 local config, validated the same way. Used when
// Supabase isn't configured or a read fails — the public site never breaks.
function loadLocalWidgets(includeHidden = false): Widget[] {
  return localWidgets
    .filter((w) => includeHidden || w.visible)
    .sort((a, b) => a.position - b.position)
    .map((w) => parseWidget(w))
    .filter((w): w is Widget => w !== null);
}

// A render scope (subset of DashboardScope) — kept structural to avoid a server
// import cycle with the qrcode route.
export interface WidgetScope {
  dashboardId: string | null;
  defaultDashboardId: string | null;
}

// Public dashboard data for one version. Reads that version's visible widgets;
// on any failure falls back to local config for the DEFAULT version only (a
// non-default version renders empty rather than borrowing the default's tiles).
// Admin presence (weather / "ma-loc") stays GLOBAL — read from the default
// version's settings row.
export async function loadPublicWidgets(scope?: WidgetScope): Promise<Widget[]> {
  const dashboardId = scope?.dashboardId ?? null;
  const defaultDashboardId = scope?.defaultDashboardId ?? null;
  const isDefault = !dashboardId || dashboardId === defaultDashboardId;
  const empty: Widget[] = [];

  const client = getPublicServerSupabase();
  if (!client) return deoverlap(loadLocalWidgets());
  try {
    const rows = await getWidgets(client, { includeHidden: false, dashboardId });
    if (rows.length === 0) return isDefault ? deoverlap(loadLocalWidgets()) : empty;
    let presence: SiteSettingsRow | null = null;
    try {
      presence = await getSiteSettings(client, defaultDashboardId);
    } catch {
      presence = null;
    }
    const parsed = rows
      .sort((a, b) => a.position - b.position)
      .map((r) => parseWidget(fromRow(r)))
      .filter((w): w is Widget => w !== null);
    return deoverlap(applyPresence(dropReachedHiddenCountdowns(parsed), presence));
  } catch {
    return isDefault ? deoverlap(loadLocalWidgets()) : empty;
  }
}

// Admin data: all widgets (incl. hidden) for one version, read as the signed-in
// admin (RLS grants full read). A null dashboardId (legacy / pre-migration)
// reads all widgets unscoped. Falls back to the local config for offline preview.
export async function loadAdminWidgets(dashboardId?: string | null): Promise<Widget[]> {
  const client = await getServerSupabase();
  if (!client) return loadLocalWidgets(true);
  try {
    const rows = await getWidgets(client, { includeHidden: true, dashboardId });
    return rows
      .sort((a, b) => a.position - b.position)
      .map((r) => parseWidget(fromRow(r)))
      .filter((w): w is Widget => w !== null);
  } catch {
    return loadLocalWidgets(true);
  }
}
