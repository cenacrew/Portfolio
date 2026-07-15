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
