import { z } from "zod";

// A vertical CV / career timeline: manually authored entries shown newest-first
// on a rail. Built for the "work" version of the dashboard. Entries are ordered,
// added and removed in the mobile editor; the public tile shows as many as fit
// its format (like the Letterboxd tile) and never overflows.
export const cvTimelineEntrySchema = z.object({
  // Stable id so the editor can reorder / remove without index churn.
  id: z.string().min(1),
  // A short period label, e.g. "2023 — aujourd'hui" or "2021".
  period: z.string().min(1).max(60),
  title: z.string().min(1).max(120),
  place: z.string().max(120).default(""),
  logoUrl: z.string().max(400).optional(),
  description: z.string().max(400).optional(),
});

export type CvTimelineEntry = z.infer<typeof cvTimelineEntrySchema>;

export const cvTimelineSchema = z.object({
  title: z.string().max(60).default("Parcours"),
  entries: z.array(cvTimelineEntrySchema).default([]),
});

export type CvTimelineConfig = z.infer<typeof cvTimelineSchema>;

export const cvTimelineDefault: CvTimelineConfig = {
  title: "Parcours",
  entries: [
    { id: "a", period: "2023 — aujourd'hui", title: "Développeur produit", place: "Freelance" },
    { id: "b", period: "2021 — 2023", title: "Ingénieur logiciel", place: "Studio" },
  ],
};

export const cvTimelineLabel = "Frise de parcours";

import type { WidgetMediaSpec } from "./media-spec";

// Media: each entry's optional logo.
export const cvTimelineMedia: WidgetMediaSpec = {
  urls: (config) => {
    const entries = (config as Partial<CvTimelineConfig>)?.entries;
    return Array.isArray(entries) ? entries.map((e) => e?.logoUrl) : [];
  },
};

// A fresh entry for the "add" button, with a short random id.
export function makeCvTimelineEntry(): CvTimelineEntry {
  return {
    id: Math.random().toString(36).slice(2, 8),
    period: "Année",
    title: "Poste",
    place: "",
  };
}
