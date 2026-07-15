import "server-only";
import { LEGACY_DEFAULT_ID, listDashboards } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";

// The version behind the printed QR codes. `/qrcode` renders this one.
export const DEFAULT_SLUG = "default";

// What a page needs to render one version. `dashboardId === null` means the
// unscoped / pre-migration state (all widgets, single site_settings row) — the
// current behaviour, so `/qrcode` never breaks before migration 0007 runs.
export interface DashboardScope {
  slug: string;
  name: string | null;
  dashboardId: string | null;
  defaultDashboardId: string | null;
}

const LEGACY_SCOPE: DashboardScope = {
  slug: DEFAULT_SLUG,
  name: null,
  dashboardId: null,
  defaultDashboardId: null,
};

// Resolves a slug to a render scope, or null when the slug doesn't exist (→ 404).
// The default slug always resolves: to the legacy scope before migration, to the
// default version after. Any failure on the default slug degrades to the legacy
// scope (all widgets) rather than a 404, keeping the printed QR alive.
export async function resolveDashboardScope(slug: string): Promise<DashboardScope | null> {
  const isDefaultSlug = slug === DEFAULT_SLUG;
  const client = getPublicServerSupabase();
  if (!client) return isDefaultSlug ? LEGACY_SCOPE : null;

  let list;
  try {
    list = await listDashboards(client);
  } catch {
    return isDefaultSlug ? LEGACY_SCOPE : null;
  }

  // Table not migrated yet → single synthetic legacy default.
  if (list.length === 1 && list[0].id === LEGACY_DEFAULT_ID) {
    return isDefaultSlug ? LEGACY_SCOPE : null;
  }

  const found = list.find((d) => d.slug === slug);
  if (!found) return null;
  const def = list.find((d) => d.is_default) ?? found;
  return {
    slug: found.slug,
    name: found.name || null,
    dashboardId: found.id,
    defaultDashboardId: def.id,
  };
}
