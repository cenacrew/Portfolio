import { z } from "zod";

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "instagram",
  "x",
  "discord",
  "youtube",
  "twitch",
  "email",
  "generic",
] as const;

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().min(1),
  handle: z.string().optional(),
  label: z.string().optional(),
});

export type SocialLinkConfig = z.infer<typeof socialLinkSchema>;

export const socialLinkDefault: SocialLinkConfig = {
  platform: "generic",
  url: "https://example.com",
  handle: "@handle",
};

export const socialLinkLabel = "Lien réseau social";
