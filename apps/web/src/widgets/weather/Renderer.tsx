/* eslint-disable @next/next/no-img-element */
import { getSiteSettings } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { WeatherConfig } from "./schema";

// Open-Meteo — free, no API key. Cached server-side for 30 min.
type Scene = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

// Label + gradient scene for the tile background.
function wmo(code: number): { label: string; scene: Scene } {
  const map: Record<number, { label: string; scene: Scene }> = {
    0: { label: "Ciel clair", scene: "clear" },
    1: { label: "Peu nuageux", scene: "clear" },
    2: { label: "Partiellement nuageux", scene: "partly" },
    3: { label: "Couvert", scene: "cloudy" },
    45: { label: "Brouillard", scene: "fog" },
    48: { label: "Brouillard givrant", scene: "fog" },
    51: { label: "Bruine", scene: "rain" },
    53: { label: "Bruine", scene: "rain" },
    55: { label: "Bruine", scene: "rain" },
    56: { label: "Bruine verglaçante", scene: "rain" },
    57: { label: "Bruine verglaçante", scene: "rain" },
    61: { label: "Pluie", scene: "rain" },
    63: { label: "Pluie", scene: "rain" },
    65: { label: "Forte pluie", scene: "rain" },
    66: { label: "Pluie verglaçante", scene: "rain" },
    67: { label: "Pluie verglaçante", scene: "rain" },
    71: { label: "Neige", scene: "snow" },
    73: { label: "Neige", scene: "snow" },
    75: { label: "Forte neige", scene: "snow" },
    77: { label: "Grésil", scene: "snow" },
    80: { label: "Averses", scene: "rain" },
    81: { label: "Averses", scene: "rain" },
    82: { label: "Fortes averses", scene: "rain" },
    85: { label: "Averses de neige", scene: "snow" },
    86: { label: "Averses de neige", scene: "snow" },
    95: { label: "Orage", scene: "storm" },
    96: { label: "Orage de grêle", scene: "storm" },
    99: { label: "Orage de grêle", scene: "storm" },
  };
  return map[code] ?? { label: "—", scene: "cloudy" };
}

// Animated Meteocons icon per WMO code, with day/night variants where relevant
// (phase 4.11 A5). Files live under /files/img/weather (MIT, committed locally).
function iconFor(code: number, isDay: boolean): string {
  const dn = isDay ? "day" : "night";
  switch (code) {
    case 0:
    case 1:
      return `clear-${dn}`;
    case 2:
      return `partly-cloudy-${dn}`;
    case 3:
      return `overcast-${dn}`;
    case 45:
    case 48:
      return `fog-${dn}`;
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 56:
    case 57:
    case 66:
    case 67:
      return "sleet";
    case 61:
    case 63:
    case 65:
    case 82:
      return "rain";
    case 80:
    case 81:
      return `partly-cloudy-${dn}-rain`;
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "snow";
    case 95:
      return "thunderstorms";
    case 96:
    case 99:
      return "thunderstorms-rain";
    default:
      return "cloudy";
  }
}

type Current = { temperature_2m: number; weather_code: number; is_day: number };

export default async function WeatherRenderer({
  config,
}: WidgetRendererProps<WeatherConfig>) {
  // Resolve the location: follow the admin's presence by default (A7), fall
  // back to the widget's own fixed city/coords when presence is off or absent.
  let lat = config.lat;
  let lng = config.lng;
  let city = config.city;
  if (config.followPresence) {
    const client = getPublicServerSupabase();
    if (client) {
      try {
        const s = await getSiteSettings(client);
        if (s && typeof s.lat === "number" && typeof s.lng === "number") {
          lat = s.lat;
          lng = s.lng;
          city = s.city || city;
        }
      } catch {
        // keep fixed fallback
      }
    }
  }

  let current: Current | null = null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
      `&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (res.ok) current = ((await res.json()) as { current: Current }).current;
  } catch {
    current = null;
  }

  const info = current ? wmo(current.weather_code) : null;
  const scene: Scene = info?.scene ?? "cloudy";
  const night = current ? current.is_day === 0 : false;
  const icon = current
    ? iconFor(current.weather_code, !night)
    : "not-available";

  return (
    <div
      className={`w-weather w-weather--${scene}${night ? " w-weather--night" : ""}`}
    >
      <span className="w-weather__icon" aria-hidden>
        <img src={`/files/img/weather/${icon}.svg`} alt="" />
      </span>
      <div className="w-weather__content">
        <div className="w-weather__top">
          <span className="w-weather__city">{city}</span>
        </div>
        <div className="w-weather__temp">
          {current ? Math.round(current.temperature_2m) : "—"}
          <span>°</span>
        </div>
        <span className="w-weather__desc">{info?.label ?? "Indisponible"}</span>
      </div>
    </div>
  );
}
