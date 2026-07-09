import "server-only";
import type { SiteSettingsRow } from "@portfolio/shared";
import { getSiteSettings } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";

// The header values as they were hard-coded before phase 4.5. Used verbatim
// when Supabase isn't configured, the table is empty, or a read fails — so the
// public /qrcode header never breaks and matches production.
export const HEADER_FALLBACK: Omit<SiteSettingsRow, "id" | "updated_at"> = {
  name: "Valentin Sourdois Pajot",
  tagline: "Développeur Full-Stack · créatif du numérique",
  available_text: "Dispo pour un projet",
  available_show: true,
  location: "Bordeaux",
  location_show: true,
  chips: [],
};

export type HeaderSettings = typeof HEADER_FALLBACK;

// Reads the editable header from Supabase, falling back to the hard-coded
// values on any failure. Empty text fields fall back per-field too.
export async function loadHeaderSettings(): Promise<HeaderSettings> {
  const client = getPublicServerSupabase();
  if (!client) return HEADER_FALLBACK;
  try {
    const row = await getSiteSettings(client);
    if (!row) return HEADER_FALLBACK;
    return {
      name: row.name || HEADER_FALLBACK.name,
      tagline: row.tagline || HEADER_FALLBACK.tagline,
      available_text: row.available_text,
      available_show: row.available_show,
      location: row.location,
      location_show: row.location_show,
      chips: Array.isArray(row.chips) ? row.chips : [],
    };
  } catch {
    return HEADER_FALLBACK;
  }
}
