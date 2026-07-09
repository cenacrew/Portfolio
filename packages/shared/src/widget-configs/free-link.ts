import { z } from "zod";

export const freeLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  image: z.string().optional(),
  accent: z.string().optional(),
  emoji: z.string().optional(),
});

export type FreeLinkConfig = z.infer<typeof freeLinkSchema>;

export const freeLinkDefault: FreeLinkConfig = {
  title: "Mon lien",
  url: "https://example.com",
};

export const freeLinkLabel = "Lien libre";
