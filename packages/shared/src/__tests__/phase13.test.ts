import { describe, it, expect } from "vitest";
import {
  GAME_ACCENTS,
  GAME_KEYS,
  GAME_SCORE_CAP,
  isCleanPseudo,
  isGameKey,
  isPlausibleScore,
  LEADERBOARD_SIZE,
  miniGameSchema,
  miniGameDefault,
  pseudoSchema,
  sanitizePseudo,
} from "../widget-configs";

// ---------- mini-game — config schema ---------------------------------------

describe("mini-game — schema", () => {
  it("default round-trips and defaults to snake", () => {
    expect(miniGameSchema.safeParse(miniGameDefault).success).toBe(true);
    expect(miniGameDefault.game).toBe("snake");
  });

  it("defaults game to snake when omitted", () => {
    expect(miniGameSchema.parse({}).game).toBe("snake");
  });

  it("accepts snake and flappy, rejects anything else", () => {
    expect(miniGameSchema.safeParse({ game: "snake" }).success).toBe(true);
    expect(miniGameSchema.safeParse({ game: "flappy" }).success).toBe(true);
    expect(miniGameSchema.safeParse({ game: "pong" }).success).toBe(false);
  });

  it("caps the title length", () => {
    expect(miniGameSchema.safeParse({ game: "snake", title: "x".repeat(41) }).success).toBe(false);
    expect(miniGameSchema.safeParse({ game: "snake", title: "Arcade" }).success).toBe(true);
  });

  it("exposes an accent for every game key", () => {
    for (const g of GAME_KEYS) expect(GAME_ACCENTS[g]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("isGameKey guards unknown values", () => {
    expect(isGameKey("snake")).toBe(true);
    expect(isGameKey("flappy")).toBe(true);
    expect(isGameKey("tetris")).toBe(false);
    expect(isGameKey(42)).toBe(false);
  });
});

// ---------- mini-game — score plausibility ----------------------------------

describe("mini-game — plausibility cap", () => {
  it("accepts believable scores up to each game's cap", () => {
    expect(isPlausibleScore("snake", 0)).toBe(true);
    expect(isPlausibleScore("snake", 42)).toBe(true);
    expect(isPlausibleScore("snake", GAME_SCORE_CAP.snake)).toBe(true);
    expect(isPlausibleScore("flappy", GAME_SCORE_CAP.flappy)).toBe(true);
  });

  it("rejects forged scores above the cap", () => {
    expect(isPlausibleScore("snake", GAME_SCORE_CAP.snake + 1)).toBe(false);
    expect(isPlausibleScore("flappy", 999_999)).toBe(false);
  });

  it("rejects negative and non-integer scores", () => {
    expect(isPlausibleScore("snake", -1)).toBe(false);
    expect(isPlausibleScore("snake", 3.5)).toBe(false);
    expect(isPlausibleScore("flappy", Number.NaN)).toBe(false);
    expect(isPlausibleScore("flappy", Infinity)).toBe(false);
  });
});

// ---------- mini-game — arcade initials -------------------------------------

describe("mini-game — pseudo", () => {
  it("sanitizes free input to 3 uppercase letters", () => {
    expect(sanitizePseudo("abc")).toBe("ABC");
    expect(sanitizePseudo("a1b2c3d4")).toBe("ABC");
    expect(sanitizePseudo("  vsp  ")).toBe("VSP");
    expect(sanitizePseudo("é@#z")).toBe("Z");
  });

  it("validates exactly three A–Z letters", () => {
    expect(pseudoSchema.safeParse("ABC").success).toBe(true);
    expect(pseudoSchema.safeParse("AB").success).toBe(false);
    expect(pseudoSchema.safeParse("ABCD").success).toBe(false);
    expect(pseudoSchema.safeParse("A1C").success).toBe(false);
    expect(pseudoSchema.safeParse("abc").success).toBe(false);
  });

  it("blocks a basic profanity list", () => {
    expect(isCleanPseudo("ABC")).toBe(true);
    expect(isCleanPseudo("VSP")).toBe(true);
    expect(isCleanPseudo("ass")).toBe(false);
    expect(pseudoSchema.safeParse("ASS").success).toBe(false);
  });

  it("keeps the leaderboard window at 10", () => {
    expect(LEADERBOARD_SIZE).toBe(10);
  });
});
