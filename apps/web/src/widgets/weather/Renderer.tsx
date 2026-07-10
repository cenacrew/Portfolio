import { getSiteSettings } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { WeatherConfig } from "./schema";

// Open-Meteo — free, no API key. Cached server-side for 30 min.
type WmoInfo = { label: string; scene: Scene };
type Scene = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

function wmo(code: number): WmoInfo {
  const map: Record<number, WmoInfo> = {
    0: { label: "Ciel clair", scene: "clear" },
    1: { label: "Peu nuageux", scene: "partly" },
    2: { label: "Nuageux", scene: "partly" },
    3: { label: "Couvert", scene: "cloudy" },
    45: { label: "Brouillard", scene: "fog" },
    48: { label: "Brouillard givrant", scene: "fog" },
    51: { label: "Bruine", scene: "rain" },
    53: { label: "Bruine", scene: "rain" },
    55: { label: "Bruine", scene: "rain" },
    61: { label: "Pluie", scene: "rain" },
    63: { label: "Pluie", scene: "rain" },
    65: { label: "Forte pluie", scene: "rain" },
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
    96: { label: "Orage", scene: "storm" },
    99: { label: "Orage de grêle", scene: "storm" },
  };
  return map[code] ?? { label: "—", scene: "cloudy" };
}

type Current = { temperature_2m: number; weather_code: number; is_day: number };

// Homemade illustration per condition — gradients + CSS/SVG shapes, no external
// images (phase 4.10 A7). Rendered as an absolute background behind the text.
function Scene({ scene, night }: { scene: Scene; night: boolean }) {
  const clouds = (
    <>
      <span className="w-wx__cloud w-wx__cloud--a" />
      <span className="w-wx__cloud w-wx__cloud--b" />
    </>
  );
  const drops = (
    <span className="w-wx__precip" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <i key={i} style={{ ["--n" as string]: i }} />
      ))}
    </span>
  );
  return (
    <span className="w-wx" aria-hidden>
      {scene === "clear" && !night && <span className="w-wx__sun" />}
      {scene === "clear" && night && (
        <>
          <span className="w-wx__moon" />
          <span className="w-wx__stars" />
        </>
      )}
      {scene === "partly" && (
        <>
          {night ? <span className="w-wx__moon w-wx__moon--sm" /> : <span className="w-wx__sun w-wx__sun--sm" />}
          <span className="w-wx__cloud w-wx__cloud--a" />
        </>
      )}
      {scene === "cloudy" && clouds}
      {scene === "fog" && (
        <span className="w-wx__fog">
          <i /><i /><i /><i />
        </span>
      )}
      {scene === "rain" && (
        <>
          <span className="w-wx__cloud w-wx__cloud--a" />
          {drops}
        </>
      )}
      {scene === "snow" && (
        <>
          <span className="w-wx__cloud w-wx__cloud--a" />
          <span className="w-wx__precip w-wx__precip--snow">
            {Array.from({ length: 9 }).map((_, i) => (
              <i key={i} style={{ ["--n" as string]: i }} />
            ))}
          </span>
        </>
      )}
      {scene === "storm" && (
        <>
          <span className="w-wx__cloud w-wx__cloud--a w-wx__cloud--dark" />
          {drops}
          <span className="w-wx__bolt" />
        </>
      )}
    </span>
  );
}

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

  return (
    <div
      className={`w-weather w-weather--${scene}${night ? " w-weather--night" : ""}`}
    >
      <Scene scene={scene} night={night} />
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
