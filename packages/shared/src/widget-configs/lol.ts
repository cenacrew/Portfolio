import { z } from "zod";

// League of Legends widget (phase 4.9). Reads a Riot account's ranked,
// mastery or ARAM stats through the server-side /api/lol route (the Riot API
// key never reaches the client). ARAM uses challenges-v1 "Triomphe en ARAM"
// (id 101307), an honest cumulative counter of ARAM WINS (not games played) —
// the widget labels it exactly that: "victoires ARAM".
export const lolMode = z.enum(["rank-soloq", "rank-flex", "aram", "mastery"]);
export type LolMode = z.infer<typeof lolMode>;

export const lolSchema = z.object({
  // Riot ID in "gameName#tagLine" form (e.g. "cenacrew#EUW"). The PUUID is
  // resolved server-side from this, never hardcoded.
  riotId: z.string().min(3).default("cenacrew#EUW"),
  mode: lolMode.default("rank-soloq"),
});

export type LolConfig = z.infer<typeof lolSchema>;

export const lolDefault: LolConfig = {
  riotId: "cenacrew#EUW",
  mode: "rank-soloq",
};

export const lolLabel = "League of Legends";

// Human labels for the modes, reused by the web + mobile editors.
export const LOL_MODE_LABELS: Record<LolMode, string> = {
  "rank-soloq": "Classé Solo/Duo",
  "rank-flex": "Classé Flexe",
  aram: "Victoires ARAM",
  mastery: "Maîtrise (champion favori)",
};
