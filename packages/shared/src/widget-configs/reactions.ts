import { z } from "zod";

// An emoji reaction bar: visitors tap an emoji and its counter ticks up live
// (Realtime). Counts live in the `widget_reactions` table (one row per
// widget_id + emoji), incremented through a security-definer RPC via the server
// API route — never written directly from the client. The config only declares
// which emojis are offered; the counts are read from the DB at render time.
export const REACTIONS_DEFAULT_EMOJIS = ["❤️", "🔥", "👏", "😂"];

// A single emoji, kept short so a hand-crafted request can't stuff arbitrary
// text into the counter key. Emoji sequences (skin tones, ZWJ) fit in 8 chars.
export const reactionEmojiSchema = z.string().min(1).max(8);

export const reactionsSchema = z.object({
  title: z.string().max(60).default("Une réaction ?"),
  emojis: z.array(reactionEmojiSchema).min(1).max(8).default(REACTIONS_DEFAULT_EMOJIS),
});

export type ReactionsConfig = z.infer<typeof reactionsSchema>;

export const reactionsDefault: ReactionsConfig = {
  title: "Une réaction ?",
  emojis: REACTIONS_DEFAULT_EMOJIS,
};

export const reactionsLabel = "Réactions";

// Phase 19 — visitor-added custom emojis.
// Max custom emojis (those not in the widget's configured set) a widget accepts,
// so the tile can't be flooded. Mirrored by the add_custom_reaction RPC cap.
export const REACTIONS_CUSTOM_CAP = 8;

// Strict single-emoji validation for the visitor "+" flow. A valid custom emoji
// is EXACTLY one grapheme cluster that carries an emoji base — this rejects
// arbitrary text, multi-emoji strings, plain letters/digits, and whitespace.
//
// - `Intl.Segmenter` (grapheme granularity) guarantees a single visible glyph,
//   so ZWJ sequences (👨‍👩‍👧, flags, skin tones) count as one and "ab" / "🔥🔥"
//   are rejected.
// - `\p{Extended_Pictographic}` guarantees the glyph is actually pictographic —
//   NOT `\p{Emoji}`, which also matches ASCII digits and `#`/`*`.
// - The code-point length gate mirrors the DB `char_length` 1..8 check so an
//   extreme ZWJ chain can't be stored past what the column accepts.
// The emojis in `all` that aren't part of the widget's configured set — i.e.
// the visitor-added customs that count against the cap.
export function customReactionEmojis(all: string[], config: string[]): string[] {
  const configured = new Set(config);
  return all.filter((e) => !configured.has(e));
}

// Whether another custom emoji may be added: under the cap AND not a duplicate
// of an emoji already present (configured or custom).
export function canAddCustomReaction(
  all: string[],
  config: string[],
  candidate: string,
  cap: number = REACTIONS_CUSTOM_CAP,
): boolean {
  if (all.includes(candidate)) return false;
  return customReactionEmojis(all, config).length < cap;
}

export function isSingleEmoji(input: unknown): input is string {
  if (typeof input !== "string") return false;
  const s = input.trim();
  if (!s) return false;
  const codePoints = [...s];
  if (codePoints.length < 1 || codePoints.length > 8) return false;
  const graphemes = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)];
  if (graphemes.length !== 1) return false;
  return /\p{Extended_Pictographic}/u.test(s);
}
