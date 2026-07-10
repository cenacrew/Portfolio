import "server-only";
import type { Breakpoint, Widget, WidgetRow } from "@portfolio/shared";
import { GRID, getWidgets, resolveCollisions } from "@portfolio/shared";
import { widgets as localWidgets } from "@/config/widgets.config";
import { getPublicServerSupabase, getServerSupabase } from "@/lib/supabase/server";
import { registry } from "./registry";

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

// Public dashboard data. Reads visible widgets from Supabase; on any failure
// (not configured, network, migrations not run yet) falls back to local config.
export async function loadPublicWidgets(): Promise<Widget[]> {
  const client = getPublicServerSupabase();
  if (!client) return deoverlap(loadLocalWidgets());
  try {
    const rows = await getWidgets(client, { includeHidden: false });
    if (rows.length === 0) return deoverlap(loadLocalWidgets());
    return deoverlap(
      rows
        .sort((a, b) => a.position - b.position)
        .map((r) => parseWidget(fromRow(r)))
        .filter((w): w is Widget => w !== null),
    );
  } catch {
    return deoverlap(loadLocalWidgets());
  }
}

// Admin data: all widgets including hidden ones, read as the signed-in admin
// (RLS grants full read). Falls back to the local config for offline preview.
export async function loadAdminWidgets(): Promise<Widget[]> {
  const client = await getServerSupabase();
  if (!client) return loadLocalWidgets(true);
  try {
    const rows = await getWidgets(client, { includeHidden: true });
    return rows
      .sort((a, b) => a.position - b.position)
      .map((r) => parseWidget(fromRow(r)))
      .filter((w): w is Widget => w !== null);
  } catch {
    return loadLocalWidgets(true);
  }
}
