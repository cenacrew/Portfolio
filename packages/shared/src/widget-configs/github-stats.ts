import { z } from "zod";

export const githubStatsSchema = z.object({
  username: z.string().min(1),
  weeks: z.number().int().min(4).max(16).default(10),
});

export type GithubStatsConfig = z.infer<typeof githubStatsSchema>;

export const githubStatsDefault: GithubStatsConfig = {
  username: "cenacrew",
  weeks: 10,
};

export const githubStatsLabel = "Stats GitHub";
