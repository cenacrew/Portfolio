import { z } from "zod";

export const countdownSchema = z.object({
  title: z.string().min(1),
  target: z.string(), // ISO date
  emoji: z.string().default("🎯"),
});

export type CountdownConfig = z.infer<typeof countdownSchema>;

export const countdownDefault: CountdownConfig = {
  title: "Événement",
  target: new Date(Date.now() + 30 * 864e5).toISOString(),
  emoji: "🎯",
};

export const countdownLabel = "Compte à rebours";
