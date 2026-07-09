import type { WidgetRow } from "@portfolio/shared";
import { getWidgets, updateWidget } from "@portfolio/shared";
import * as Location from "expo-location";
import { supabase } from "./supabase";

// "Ma loc" (phase 4.5): once per app launch, any location-map widget in
// `mode: "ma-loc"` is re-centered on this device's current position. Foreground
// permission only (Expo Go compatible). On refusal or failure we leave the
// widget's existing coordinates untouched (graceful fallback to the fixed city).
//
// Runs at most once per JS session (module-level guard) so it doesn't spam on
// every screen focus.
let done = false;

async function reverseCity(lat: number, lng: number): Promise<string | null> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const p = places[0];
    return p?.city ?? p?.subregion ?? p?.region ?? null;
  } catch {
    return null;
  }
}

export async function syncMaLocationOnce(): Promise<void> {
  if (done) return;
  done = true;

  let rows: WidgetRow[];
  try {
    rows = await getWidgets(supabase, { includeHidden: true });
  } catch {
    return;
  }

  const targets = rows.filter(
    (w) => w.type === "location-map" && (w.config as { mode?: string } | null)?.mode === "ma-loc",
  );
  if (targets.length === 0) return;

  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return; // Fallback: keep the fixed city already stored.

  let pos: Location.LocationObject;
  try {
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return;
  }

  const lat = Number(pos.coords.latitude.toFixed(5));
  const lng = Number(pos.coords.longitude.toFixed(5));
  const city = await reverseCity(lat, lng);

  await Promise.all(
    targets.map((w) => {
      const cfg = (w.config && typeof w.config === "object" ? w.config : {}) as Record<string, unknown>;
      return updateWidget(supabase, w.id, {
        config: { ...cfg, lat, lng, ...(city ? { city } : {}) },
      }).catch(() => undefined);
    }),
  );
}
