import type { WidgetRendererProps } from "../types";
import type { WeatherConfig } from "./schema";

// Open-Meteo — free, no API key. Cached server-side for 30 min.
type WmoInfo = { label: string; emoji: string };

function wmo(code: number): WmoInfo {
  const map: Record<number, WmoInfo> = {
    0: { label: "Ciel clair", emoji: "☀️" },
    1: { label: "Peu nuageux", emoji: "🌤️" },
    2: { label: "Nuageux", emoji: "⛅" },
    3: { label: "Couvert", emoji: "☁️" },
    45: { label: "Brouillard", emoji: "🌫️" },
    48: { label: "Brouillard givrant", emoji: "🌫️" },
    51: { label: "Bruine", emoji: "🌦️" },
    53: { label: "Bruine", emoji: "🌦️" },
    55: { label: "Bruine", emoji: "🌦️" },
    61: { label: "Pluie", emoji: "🌧️" },
    63: { label: "Pluie", emoji: "🌧️" },
    65: { label: "Forte pluie", emoji: "🌧️" },
    71: { label: "Neige", emoji: "🌨️" },
    73: { label: "Neige", emoji: "🌨️" },
    75: { label: "Forte neige", emoji: "❄️" },
    80: { label: "Averses", emoji: "🌦️" },
    81: { label: "Averses", emoji: "🌦️" },
    82: { label: "Fortes averses", emoji: "⛈️" },
    95: { label: "Orage", emoji: "⛈️" },
    96: { label: "Orage", emoji: "⛈️" },
    99: { label: "Orage de grêle", emoji: "⛈️" },
  };
  return map[code] ?? { label: "—", emoji: "🌡️" };
}

type Current = { temperature_2m: number; weather_code: number };

export default async function WeatherRenderer({
  config,
}: WidgetRendererProps<WeatherConfig>) {
  let current: Current | null = null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${config.lat}` +
      `&longitude=${config.lng}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (res.ok) current = ((await res.json()) as { current: Current }).current;
  } catch {
    current = null;
  }

  const info = current ? wmo(current.weather_code) : null;

  return (
    <div className="w-weather">
      <div className="w-weather__top">
        <span className="w-weather__emoji" aria-hidden>
          {info?.emoji ?? "🌡️"}
        </span>
        <span className="w-weather__city">{config.city}</span>
      </div>
      <div className="w-weather__temp">
        {current ? Math.round(current.temperature_2m) : "—"}
        <span>°</span>
      </div>
      <span className="w-weather__desc">{info?.label ?? "Indisponible"}</span>
    </div>
  );
}
