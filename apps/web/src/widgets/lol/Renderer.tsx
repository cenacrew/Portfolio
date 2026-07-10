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
  level?: number;
  points?: number;
  // aram: challenges-v1 101307 "Triomphe en ARAM" — cumulative ARAM WINS.
  aramWins?: number;
  challengeTier?: string;
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

  const head = (
    <div className="w-lol__head">
      <span className="w-lol__logo" aria-hidden>
        <b />
        <b />
      </span>
      <span className="w-eyebrow">League of Legends</span>
    </div>
  );

  // Loading / hard failure → calm placeholder, never a broken tile.
  if (!loaded) {
    return (
      <div className="w-lol w-lol--idle">
        {head}
        <span className="w-lol__muted">Chargement…</span>
      </div>
    );
  }
  if (!data || !data.ok) {
    return (
      <div className="w-lol w-lol--idle">
        {head}
        <span className="w-lol__muted">Stats indisponibles</span>
      </div>
    );
  }

  if (data.mode === "mastery") {
    return (
      <div className="w-lol w-lol--mastery">
        {head}
        <div className="w-lol__body">
          <span className="w-lol__champ">
            {data.championIconUrl ? (
              <img className="w-lol__champ-img" src={data.championIconUrl} alt="" />
            ) : (
              <span className="w-lol__champ-img w-lol__champ-img--ph" aria-hidden>
                ⚔
              </span>
            )}
            {typeof data.level === "number" ? (
              <span className="w-lol__lvl">{data.level}</span>
            ) : null}
          </span>
          <span className="w-lol__info">
            <span className="w-lol__name">{data.champion}</span>
            <span className="w-lol__queue">Champion favori</span>
            <span className="w-lol__points">
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
        {head}
        <div className="w-lol__body w-lol__body--aram">
          <span className="w-lol__big">{(data.aramWins ?? 0).toLocaleString("fr-FR")}</span>
          <span className="w-lol__info">
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
      {head}
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
                  {data.wins}V {data.losses}D{wr !== null ? ` · ${wr}%` : ""}
                </span>
              </span>
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
