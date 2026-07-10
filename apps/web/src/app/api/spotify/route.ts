import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape consumed by the spotify-now-playing widget. `null` = nothing playing
// AND no recent history / not configured, rendered as a calm idle state.
// `isLast: true` means nothing is playing right now and this is the LAST track
// listened to (phase 4.8 B7) — the widget labels it "dernier son écouté".
interface NowPlaying {
  isPlaying: boolean;
  isLast?: boolean;
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

type Track = {
  name?: string;
  duration_ms?: number;
  artists?: { name?: string }[];
  album?: { images?: { url?: string }[] };
};

function fromTrack(item: Track, extra: Partial<NowPlaying>): NowPlaying {
  return {
    isPlaying: false,
    track: item.name ?? "—",
    artist: (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") || "—",
    albumArt: item.album?.images?.[0]?.url,
    progressMs: 0,
    durationMs: item.duration_ms ?? 1,
    ...extra,
  };
}

async function fetchNowPlaying(): Promise<NowPlaying | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // 200 with a track → live playback.
  if (res.ok && res.status !== 204) {
    const data = (await res.json()) as { is_playing?: boolean; progress_ms?: number; item?: Track };
    if (data.item?.name) {
      return fromTrack(data.item, {
        isPlaying: Boolean(data.is_playing),
        progressMs: data.progress_ms ?? 0,
      });
    }
  }

  // Nothing playing (204 / paused / empty) → fall back to the last played track
  // (phase 4.8 B7), flagged so the widget shows "dernier son écouté".
  const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!recent.ok) return null;
  const rjson = (await recent.json()) as { items?: { track?: Track }[] };
  const last = rjson.items?.[0]?.track;
  if (!last?.name) return null;
  return fromTrack(last, { isPlaying: false, isLast: true });
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
