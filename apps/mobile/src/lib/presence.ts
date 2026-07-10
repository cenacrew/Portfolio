import { updateSiteSettings } from "@portfolio/shared";
import * as Location from "expo-location";
import { supabase } from "./supabase";

// Admin presence (phase 4.8 C1). Once per app launch, write this device's
// timezone (always) and, if location permission is granted, its coordinates +
// city to site_settings. The public header clock (A4), the weather widget and
// "ma-loc" maps then follow wherever the admin currently is.
//
// Silent by design: a refused permission or any failure leaves the last known
// presence untouched (the widgets fall back to their own config).
let done = false;

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

async function reverseCity(lat: number, lng: number): Promise<string | undefined> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const p = places[0];
    return p?.city ?? p?.subregion ?? p?.region ?? undefined;
  } catch {
    return undefined;
  }
}

export async function syncPresenceOnce(): Promise<void> {
  if (done) return;
  done = true;

  const tz = deviceTimezone();
  const patch: Record<string, unknown> = { presence_updated_at: new Date().toISOString() };
  if (tz) patch.tz = tz;

  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const granted = perm.granted || (perm.canAskAgain && (await Location.requestForegroundPermissionsAsync()).granted);
    if (granted) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = Number(pos.coords.latitude.toFixed(5));
      const lng = Number(pos.coords.longitude.toFixed(5));
      patch.lat = lat;
      patch.lng = lng;
      const city = await reverseCity(lat, lng);
      if (city) patch.city = city;
    }
  } catch {
    // Keep the timezone-only update below.
  }

  try {
    await updateSiteSettings(supabase, patch as never);
  } catch {
    // Non-fatal: presence just won't refresh this launch.
  }
}
