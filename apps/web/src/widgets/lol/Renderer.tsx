"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import type { WidgetRendererProps } from "../types";
import type { LolConfig } from "./schema";

// Mirrors the /api/lol response. The Riot key stays server-side; this client
// widget only reads the already-shaped stats.
interface LolData {
  ok: boolean;
  mode: "rank-soloq" | "rank-flex" | "aram" | "mastery";
  ranked?: boolean;
  tier?: string;
  rank?: string;
  lp?: number;
  wins?: number;
  losses?: number;
  emblemUrl?: string;
  queueLabel?: string;
  champion?: string;
  championIconUrl?: string;
  splashUrl?: string;
  masteryEmblemUrl?: string;
  level?: number;
  points?: number;
  aramWins?: number;
  challengeTier?: string;
  aramMapUrl?: string;
}

function titleTier(tier?: string): string {
  if (!tier) return "";
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function winrate(wins?: number, losses?: number): number | null {
  const w = wins ?? 0;
  const total = w + (losses ?? 0);
  if (total === 0) return null;
  return Math.round((w / total) * 100);
}

// Inline League of Legends hextech emblem (gold crest). Trademark-safe crafted
// mark, no remote asset — always crisp at the small header size.
function LolLogo() {
  return (
    <span className="w-lol__logo" aria-hidden>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <defs>
          <linearGradient id="lolg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4d78a" />
            <stop offset="1" stopColor="#c8933a" />
          </linearGradient>
        </defs>
        <path
          d="M12 1.4l8.6 4.9v11.4L12 22.6 3.4 17.7V6.3z"
          fill="none"
          stroke="url(#lolg)"
          strokeWidth="1.4"
        />
        <path
          d="M9 7v8.2h5.6v-1.7h-3.7V7z"
          fill="url(#lolg)"
        />
        <path d="M12 3.4l1.1 1.9h-2.2z" fill="url(#lolg)" />
      </svg>
    </span>
  );
}

export default function LolRenderer({ config }: WidgetRendererProps<LolConfig>) {
  const [data, setData] = useState<LolData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const url = `/api/lol?mode=${encodeURIComponent(config.mode)}&riotId=${encodeURIComponent(config.riotId)}`;
    fetch(url)
      .then((r) => r.json())
      .then((json: LolData) => {
        if (alive) setData(json);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [config.mode, config.riotId]);

  const head = (dark?: boolean) => (
    <div className={`w-lol__head${dark ? " w-lol__head--over" : ""}`}>
      <LolLogo />
      <span className="w-eyebrow">League of Legends</span>
    </div>
  );

  // Loading / hard failure → calm placeholder, never a broken tile.
  if (!loaded) {
    return (
      <div className="w-lol w-lol--idle">
        {head()}
        <span className="w-lol__muted">Chargement…</span>
      </div>
    );
  }
  if (!data || !data.ok) {
    return (
      <div className="w-lol w-lol--idle">
        {head()}
        <span className="w-lol__muted">Stats indisponibles</span>
      </div>
    );
  }

  if (data.mode === "mastery") {
    return (
      <div className="w-lol w-lol--mastery">
        {data.splashUrl ? (
          <span
            className="w-lol__splash"
            style={{ backgroundImage: `url(${data.splashUrl})` }}
            aria-hidden
          />
        ) : null}
        {head(true)}
        <div className="w-lol__body w-lol__body--mastery">
          <span className="w-lol__crest">
            {data.masteryEmblemUrl ? (
              <img className="w-lol__crest-img" src={data.masteryEmblemUrl} alt="" />
            ) : (
              <span className="w-lol__crest-img w-lol__crest-img--ph" aria-hidden>
                ⚔
              </span>
            )}
            {typeof data.level === "number" ? (
              <span className="w-lol__lvl">{data.level}</span>
            ) : null}
          </span>
          <span className="w-lol__info">
            <span className="w-lol__queue w-lol__queue--over">Maîtrise · favori</span>
            <span className="w-lol__name w-lol__name--over">{data.champion}</span>
            <span className="w-lol__points w-lol__points--over">
              {(data.points ?? 0).toLocaleString("fr-FR")}
              <small> pts</small>
            </span>
          </span>
        </div>
      </div>
    );
  }

  if (data.mode === "aram") {
    // Honest label: challenge 101307 counts WINS, not games played. The
    // challenge tier (Master…) recolours the tile via data-tier.
    const tier = data.challengeTier ? data.challengeTier.toLowerCase() : "unranked";
    return (
      <div className="w-lol w-lol--aram" data-tier={tier}>
        {head()}
        <div className="w-lol__body w-lol__body--aram">
          <span className="w-lol__aram-map">
            {data.aramMapUrl ? (
              <img src={data.aramMapUrl} alt="" />
            ) : (
              <span className="w-lol__aram-map--ph" aria-hidden>
                ❄
              </span>
            )}
          </span>
          <span className="w-lol__info">
            <span className="w-lol__big">{(data.aramWins ?? 0).toLocaleString("fr-FR")}</span>
            <span className="w-lol__queue">victoires ARAM</span>
            {data.challengeTier ? (
              <span className="w-lol__chip">Défi {titleTier(data.challengeTier)}</span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }

  // Rank modes.
  const wr = winrate(data.wins, data.losses);
  return (
    <div className="w-lol w-lol--rank" data-tier={data.tier ? data.tier.toLowerCase() : "unranked"}>
      {head()}
      <div className="w-lol__body">
        <span className="w-lol__emblem">
          {data.ranked && data.emblemUrl ? (
            <img className="w-lol__emblem-img" src={data.emblemUrl} alt="" />
          ) : (
            <span className="w-lol__emblem-img w-lol__emblem-img--ph" aria-hidden>
              ?
            </span>
          )}
        </span>
        <span className="w-lol__info">
          {data.ranked ? (
            <>
              <span className="w-lol__tier">
                {titleTier(data.tier)} {data.rank}
              </span>
              <span className="w-lol__queue">{data.queueLabel}</span>
              <span className="w-lol__stats">
                <span className="w-lol__lp">{data.lp} LP</span>
                <span className="w-lol__wl">
                  {data.wins}V {data.losses}D
                </span>
                {wr !== null ? <span className="w-lol__wr">{wr}% WR</span> : null}
              </span>
              {wr !== null ? (
                <span className="w-lol__meter" aria-hidden>
                  <span style={{ width: `${wr}%` }} />
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="w-lol__tier">Non classé</span>
              <span className="w-lol__queue">{data.queueLabel}</span>
              <span className="w-lol__muted w-lol__muted--sm">Aucune partie classée</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
