import { z } from "zod";

// What the tile does once the target moment is reached (phase 11):
//   message → show a custom end message (default "C'est parti 🎉")
//   elapsed → flip to an "since" counter (days/hours since the target)
//   hide    → drop the tile from the PUBLIC dashboard (still shown/editable in
//             the admin). Filtered server-side in the public loader.
export const COUNTDOWN_END_BEHAVIORS = ["message", "elapsed", "hide"] as const;
export type CountdownEndBehavior = (typeof COUNTDOWN_END_BEHAVIORS)[number];

export const COUNTDOWN_DEFAULT_END_MESSAGE = "C'est parti 🎉";

export const countdownSchema = z.object({
  title: z.string().min(1),
  target: z.string(), // ISO date
  emoji: z.string().default("🎯"),
  // Existing configs omit these; the defaults preserve the historical behaviour
  // (a "C'est le jour !" style end message), so no data migration is needed.
  endBehavior: z.enum(COUNTDOWN_END_BEHAVIORS).default("message"),
  endMessage: z.string().default(COUNTDOWN_DEFAULT_END_MESSAGE),
});

export type CountdownConfig = z.infer<typeof countdownSchema>;

export const countdownDefault: CountdownConfig = {
  title: "Événement",
  target: new Date(Date.now() + 30 * 864e5).toISOString(),
  emoji: "🎯",
  endBehavior: "message",
  endMessage: COUNTDOWN_DEFAULT_END_MESSAGE,
};

export const countdownLabel = "Compte à rebours";

// Single source of truth for "this countdown is past its target AND configured
// to hide once reached". Consumed by the public loader (drops the tile
// server-side) and the client Renderer (renders nothing live) so the two can
// never drift. Tolerant of loosely-typed configs (the loader hands raw rows).
export function isCountdownHiddenNow(
  config: { endBehavior?: string; target?: string },
  now: number = Date.now(),
): boolean {
  if (config.endBehavior !== "hide") return false;
  const target = new Date(config.target ?? "").getTime();
  return Number.isFinite(target) && target <= now;
}
