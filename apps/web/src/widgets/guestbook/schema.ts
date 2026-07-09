import { z } from "zod";

export const guestbookMessageSchema = z.object({
  author: z.string().min(1),
  message: z.string().min(1),
  createdAt: z.string(),
});

export const guestbookSchema = z.object({
  title: z.string().default("Livre d'or"),
  prompt: z.string().default("Laisse-moi un petit mot"),
  seed: z.array(guestbookMessageSchema).default([]),
});

export type GuestbookConfig = z.infer<typeof guestbookSchema>;
export type GuestbookMessage = z.infer<typeof guestbookMessageSchema>;

export const guestbookDefault: GuestbookConfig = {
  title: "Livre d'or",
  prompt: "Laisse-moi un petit mot",
  seed: [],
};

export const guestbookLabel = "Livre d'or";
