import { z } from "zod";

// A retro-arcade mini-game tile: the visitor plays Snake or Flappy in a large
// modal, and the best runs land on a shared coin-op high-score board. The config
// only picks WHICH game and an optional title; scores live in the `game_scores`
// table (public read, inserted only through the server API route). Two instances
// can coexist on the grid (one Snake tile, one Flappy tile).
export const GAME_KEYS = ["snake", "flappy"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const GAME_LABELS: Record<GameKey, string> = {
  snake: "Snake",
  flappy: "Flappy",
};

// Signature accent per game — shared by the tile, the modal canvas and the
// mobile preview so a Snake tile always reads green and a Flappy tile amber.
// Snake's green matches the dashboard's live-dot; Flappy's amber is its own.
export const GAME_ACCENTS: Record<GameKey, string> = {
  snake: "#24c08a",
  flappy: "#f5a524",
};

export const miniGameSchema = z.object({
  game: z.enum(GAME_KEYS).default("snake"),
  // Optional marquee title; falls back to the game's name on the tile.
  title: z.string().max(40).optional(),
});

export type MiniGameConfig = z.infer<typeof miniGameSchema>;

export const miniGameDefault: MiniGameConfig = { game: "snake" };

export const miniGameLabel = "Mini-jeu";

// ---------- score plausibility ----------------------------------------------
// A forged POST can claim any number, so the server rejects scores above a
// believable ceiling per game. Snake grows by one per apple on a bounded grid;
// Flappy counts cleared pipes. Both caps sit far above real human runs but well
// under the millions a scripted request would try. Shared so the API route and
// the unit tests use the exact same rule.
export const GAME_SCORE_CAP: Record<GameKey, number> = {
  snake: 400,
  flappy: 500,
};

export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && (GAME_KEYS as readonly string[]).includes(value);
}

// True when `score` is a believable, well-formed result for `game`.
export function isPlausibleScore(game: GameKey, score: number): boolean {
  if (!Number.isInteger(score) || score < 0) return false;
  return score <= GAME_SCORE_CAP[game];
}

// ---------- arcade initials --------------------------------------------------
// Classic 3-letter coin-op initials. Uppercase A–Z only.
export const PSEUDO_LENGTH = 3;

// A short, deliberately conservative blocklist of 3-letter tokens so the public
// board can't be trivially defaced. Not exhaustive (that's a losing game) — just
// enough to stop the obvious ones. Compared lowercased.
const PSEUDO_BLOCKLIST = new Set([
  "ass", "fuc", "fuk", "fck", "sex", "cul", "con", "cum", "tit",
  "dic", "fag", "xxx", "kkk", "vag", "wtf", "sjw", "nig",
]);

// Coerce free input into valid initials: strip non-letters, uppercase, cap at 3.
export function sanitizePseudo(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, PSEUDO_LENGTH);
}

export function isCleanPseudo(pseudo: string): boolean {
  return !PSEUDO_BLOCKLIST.has(pseudo.toLowerCase());
}

// Exactly three A–Z letters, not on the blocklist. Used by the API route body.
export const pseudoSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "3 lettres A–Z")
  .refine(isCleanPseudo, "Pseudo non autorisé.");

// How many entries the board keeps / shows. A new run prompts for initials only
// when it would land in this window.
export const LEADERBOARD_SIZE = 10;
