import "server-only";
import type { SiteSettingsRow } from "@portfolio/shared";
import { getSiteSettings } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { DashboardScope } from "./dashboard";

// The header values as they were hard-coded before phase 4.5. Used verbatim
// when Supabase isn't configured, the table is empty, or a read fails — so the
// public /qrcode header never breaks and matches production.
export const HEADER_FALLBACK = {
  name: "Valentin Sourdois Pajot",
  tagline: "Développeur Full-Stack · créatif du numérique",
  available_text: "Dispo pour un projet",
  available_show: true,
  location: "Bordeaux",
  location_show: true,
  chips: [] as SiteSettingsRow["chips"],
  // Admin timezone drives the header clock (A4/C1); Europe/Paris until the app
  // reports the device's presence.
  tz: "Europe/Paris",
  // Status/mood shown in the header (B2).
  status_emoji: "💻",
  status_text: "En train de coder",
};

export type HeaderSettings = typeof HEADER_FALLBACK;

// Reads the editable header for a version from Supabase, falling back to the
// hard-coded values on any failure. The clock timezone (tz) is admin presence,
// which stays GLOBAL — it's read from the default version's row, not the one
// being rendered. Empty text fields fall back per-field too.
export async function loadHeaderSettings(scope?: DashboardScope): Promise<HeaderSettings> {
  const dashboardId = scope?.dashboardId ?? null;
  const defaultDashboardId = scope?.defaultDashboardId ?? null;
  const client = getPublicServerSupabase();
  if (!client) return HEADER_FALLBACK;
  try {
    const row = await getSiteSettings(client, dashboardId);

    // Global presence tz — same row when rendering the default version.
    let tz = row?.tz;
    if (dashboardId !== defaultDashboardId) {
      try {
        const def = await getSiteSettings(client, defaultDashboardId);
        tz = def?.tz;
      } catch {
        /* keep the version row's tz / fallback */
      }
    }

    if (!row) return { ...HEADER_FALLBACK, tz: tz || HEADER_FALLBACK.tz };
    return {
      name: row.name || HEADER_FALLBACK.name,
      tagline: row.tagline || HEADER_FALLBACK.tagline,
      available_text: row.available_text,
      available_show: row.available_show,
      location: row.location,
      location_show: row.location_show,
      chips: Array.isArray(row.chips) ? row.chips : [],
      tz: tz || HEADER_FALLBACK.tz,
      status_emoji: row.status_emoji || HEADER_FALLBACK.status_emoji,
      status_text: row.status_text || HEADER_FALLBACK.status_text,
    };
  } catch {
    return HEADER_FALLBACK;
  }
}
