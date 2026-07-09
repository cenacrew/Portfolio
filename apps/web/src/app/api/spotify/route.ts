import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape consumed by the spotify-now-playing widget. `null` = nothing playing /
// not configured, which the widget renders as a calm idle state.
interface NowPlaying {
  isPlaying: boolean;
  track: string;
  artist: string;
  albumArt?: string;
  progressMs: number;
  durationMs: number;
}

// ~30s in-memory cache to stay well under Spotify's rate limits.
let cache: { at: number; data: NowPlaying | null } | null = null;
const TTL = 30_000;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

async function fetchNowPlaying(): Promise<NowPlaying | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // 204 = nothing playing; anything non-2xx = treat as idle.
  if (res.status === 204 || !res.ok) return null;

  const data = (await res.json()) as {
    is_playing?: boolean;
    progress_ms?: number;
    item?: {
      name?: string;
      duration_ms?: number;
      artists?: { name?: string }[];
      album?: { images?: { url?: string }[] };
    };
  };
  if (!data.item?.name) return null;

  return {
    isPlaying: Boolean(data.is_playing),
    track: data.item.name,
    artist: (data.item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") || "—",
    albumArt: data.item.album?.images?.[0]?.url,
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item.duration_ms ?? 1,
  };
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL) {
    return NextResponse.json(cache.data);
  }
  try {
    const data = await fetchNowPlaying();
    cache = { at: now, data };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}
