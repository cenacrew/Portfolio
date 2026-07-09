import { z } from "zod";

export const statusSchema = z.object({
  emoji: z.string().default("💻"),
  text: z.string().min(1),
  updated: z.string().optional(),
});

export type StatusConfig = z.infer<typeof statusSchema>;

export const statusDefault: StatusConfig = {
  emoji: "💻",
  text: "En train de coder",
};

export const statusLabel = "Statut / humeur";
