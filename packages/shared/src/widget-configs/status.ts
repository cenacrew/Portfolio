import { z } from "zod";

// A quick-apply mood: an emoji plus the status text it sets.
export const moodSchema = z.object({
  emoji: z.string().min(1),
  text: z.string().min(1),
});
export type Mood = z.infer<typeof moodSchema>;

// The built-in quick moods shown in the mobile "Statut du moment" shortcut.
// Restored to the original list (phase 4.6); the admin can append their own
// via the "+" button, stored in `extraMoods` on the widget config.
export const DEFAULT_MOODS: Mood[] = [
  { emoji: "💻", text: "En train de coder" },
  { emoji: "☕", text: "Pause café" },
  { emoji: "🎧", text: "Focus, musique à fond" },
  { emoji: "🚀", text: "Sur un nouveau projet" },
  { emoji: "📚", text: "En train d'apprendre" },
];

export const statusSchema = z.object({
  emoji: z.string().default("💻"),
  text: z.string().min(1),
  updated: z.string().optional(),
  // Custom quick moods added from the app; persisted so they sync everywhere.
  extraMoods: z.array(moodSchema).default([]),
});

export type StatusConfig = z.infer<typeof statusSchema>;

export const statusDefault: StatusConfig = {
  emoji: "💻",
  text: "En train de coder",
  extraMoods: [],
};

export const statusLabel = "Statut / humeur";
