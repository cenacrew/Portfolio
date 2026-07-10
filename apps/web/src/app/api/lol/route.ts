import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// League of Legends stats, fetched server-side so the Riot API key (dev keys
// expire every 24h — the code stays defensive) never reaches the client.
//
// Routing: this account lives on EUW. Riot IDs resolve on the regional
// "europe" host; league + mastery live on the "euw1" platform host.
const PLATFORM = "https://euw1.api.riotgames.com";
const REGIONAL = "https://europe.api.riotgames.com";

// Cache TTLs. PUUIDs never change, so we cache them for a day; per-mode stats
// refresh hourly (phase 4.9 requirement). Data Dragon metadata (version +
// champion id map) is static art, cached for a day.
const PUUID_TTL = 24 * 60 * 60_000;
const STATS_TTL = 60 * 60_000;
const DDRAGON_TTL = 24 * 60 * 60_000;

type Cached<T> = { at: number; data: T };
const puuidCache = new Map<string, Cached<string | null>>();
const statsCache = new Map<string, Cached<LolResponse>>();
let championMapCache: Cached<{ version: string; byKey: Record<string, string> }> | null = null;

// Shape consumed by the lol widget Renderer. `ok: false` → "Stats indisponibles".
export interface LolResponse {
  ok: boolean;
  mode: "rank-soloq" | "rank-flex" | "mastery";
  // rank modes
  ranked?: boolean; // false → "Non classé"
  tier?: string; // e.g. "SILVER"
  rank?: string; // e.g. "III"
  lp?: number;
  wins?: number;
  losses?: number;
  emblemUrl?: string;
  queueLabel?: string;
  // mastery mode
  champion?: string;
  championIconUrl?: string;
  level?: number;
  points?: number;
}

function riotHeaders(key: string) {
  return { "X-Riot-Token": key };
}

// Resolve (and cache) the account PUUID from its Riot ID "gameName#tagLine".
async function resolvePuuid(riotId: string, key: string): Promise<string | null> {
  const hit = puuidCache.get(riotId);
  if (hit && Date.now() - hit.at < PUUID_TTL) return hit.data;

  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) return null;

  const res = await fetch(
    `${REGIONAL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: riotHeaders(key), cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { puuid?: string };
  const puuid = json.puuid ?? null;
  // Only cache a successful resolution; transient failures should retry.
  if (puuid) puuidCache.set(riotId, { at: Date.now(), data: puuid });
  return puuid;
}

// Data Dragon champion id (numeric "key") → display name + icon slug. Cached
// long: this is static art metadata, keyless and CDN-served.
async function championMap(): Promise<{ version: string; byKey: Record<string, string> }> {
  if (championMapCache && Date.now() - championMapCache.at < DDRAGON_TTL) return championMapCache.data;

  const versions = (await (
    await fetch("https://ddragon.leagueoflegends.com/api/versions.json", { cache: "no-store" })
  ).json()) as string[];
  const version = versions[0];
  const champs = (await (
    await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`, {
      cache: "no-store",
    })
  ).json()) as { data: Record<string, { key: string; name: string; id: string }> };

  const byKey: Record<string, string> = {};
  for (const c of Object.values(champs.data)) byKey[c.key] = c.id; // key = numeric id, id = "MasterYi"
  const data = { version, byKey };
  championMapCache = { at: Date.now(), data };
  return data;
}

// Community Dragon hosts the ranked tier emblems (Data Dragon does not — it
// 403s on ranked-emblem paths). Same keyless official Riot art.
function emblemUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}

async function fetchRank(
  puuid: string,
  key: string,
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR",
  mode: "rank-soloq" | "rank-flex",
): Promise<LolResponse> {
  const queueLabel = queueType === "RANKED_SOLO_5x5" ? "Classé Solo/Duo" : "Classé Flexe";
  const res = await fetch(`${PLATFORM}/lol/league/v4/entries/by-puuid/${puuid}`, {
    headers: riotHeaders(key),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, mode };

  const entries = (await res.json()) as {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }[];
  const e = entries.find((x) => x.queueType === queueType);
  if (!e) return { ok: true, mode, ranked: false, queueLabel };

  return {
    ok: true,
    mode,
    ranked: true,
    queueLabel,
    tier: e.tier,
    rank: e.rank,
    lp: e.leaguePoints,
    wins: e.wins,
    losses: e.losses,
    emblemUrl: emblemUrl(e.tier),
  };
}

async function fetchMastery(puuid: string, key: string): Promise<LolResponse> {
  const res = await fetch(
    `${PLATFORM}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=1`,
    { headers: riotHeaders(key), cache: "no-store" },
  );
  if (!res.ok) return { ok: false, mode: "mastery" };
  const top = (await res.json()) as {
    championId: number;
    championLevel: number;
    championPoints: number;
  }[];
  const m = top[0];
  if (!m) return { ok: false, mode: "mastery" };

  const { version, byKey } = await championMap();
  const slug = byKey[String(m.championId)];
  return {
    ok: true,
    mode: "mastery",
    champion: slug ? slug.replace(/([a-z])([A-Z])/g, "$1 $2") : `#${m.championId}`,
    championIconUrl: slug
      ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${slug}.png`
      : undefined,
    level: m.championLevel,
    points: m.championPoints,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const riotId = searchParams.get("riotId") || "cenacrew#EUW";
  const modeParam = searchParams.get("mode") || "rank-soloq";
  const mode: LolResponse["mode"] =
    modeParam === "rank-flex" || modeParam === "mastery" ? modeParam : "rank-soloq";

  const cacheKey = `${riotId}::${mode}`;
  const hit = statsCache.get(cacheKey);
  if (hit && Date.now() - hit.at < STATS_TTL) {
    return NextResponse.json(hit.data);
  }

  const key = process.env.RIOT_API_KEY;
  if (!key) return NextResponse.json({ ok: false, mode } satisfies LolResponse);

  try {
    const puuid = await resolvePuuid(riotId, key);
    if (!puuid) return NextResponse.json({ ok: false, mode } satisfies LolResponse);

    let data: LolResponse;
    if (mode === "mastery") data = await fetchMastery(puuid, key);
    else if (mode === "rank-flex") data = await fetchRank(puuid, key, "RANKED_FLEX_SR", "rank-flex");
    else data = await fetchRank(puuid, key, "RANKED_SOLO_5x5", "rank-soloq");

    // Only cache successful reads so an expired key recovers on the next hour
    // without serving a stale "indisponible".
    if (data.ok) statsCache.set(cacheKey, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, mode } satisfies LolResponse);
  }
}
