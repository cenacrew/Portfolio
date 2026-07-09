import { z } from "zod";

export const watchlistItemSchema = z.object({
  title: z.string().min(1),
  poster: z.string().optional(),
  accent: z.string().optional(), // fallback colour when no poster
  status: z.enum(["watching", "done", "plan"]).default("watching"),
  current: z.number().int().nonnegative().optional(),
  total: z.number().int().positive().optional(),
});

export const watchlistSchema = z.object({
  title: z.string().default("Ma watchlist"),
  items: z.array(watchlistItemSchema).min(1),
});

export type WatchlistConfig = z.infer<typeof watchlistSchema>;
export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

export const watchlistDefault: WatchlistConfig = {
  title: "Ma watchlist",
  items: [{ title: "Titre", status: "watching" }],
};

export const watchlistLabel = "Watchlist films/séries";
