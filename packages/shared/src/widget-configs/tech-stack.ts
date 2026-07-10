import { z } from "zod";

// The technologies the badge grid can display. Keys are stable ids; the web
// Renderer maps each to a local bundled SVG glyph (no CDN) and a brand tint.
export const TECH_KEYS = [
  "react",
  "nextjs",
  "typescript",
  "node",
  "postgresql",
  "supabase",
  "expo",
  "python",
  "figma",
  "photoshop",
] as const;
export type TechKey = (typeof TECH_KEYS)[number];

export const techStackSchema = z.object({
  title: z.string().default("Ma stack"),
  // Ordered list of tech keys to show. Unknown keys are ignored by the Renderer.
  items: z.array(z.enum(TECH_KEYS)).default([...TECH_KEYS]),
});

export type TechStackConfig = z.infer<typeof techStackSchema>;

export const techStackDefault: TechStackConfig = {
  title: "Ma stack",
  items: [...TECH_KEYS],
};

export const techStackLabel = "Stack technique";
