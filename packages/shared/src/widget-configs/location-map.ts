import { z } from "zod";

export const locationMapSchema = z.object({
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  zoom: z.number().min(1).max(19).default(12),
  caption: z.string().optional(),
});

export type LocationMapConfig = z.infer<typeof locationMapSchema>;

export const locationMapDefault: LocationMapConfig = {
  city: "Bordeaux",
  lat: 44.8378,
  lng: -0.5792,
  zoom: 12,
};

export const locationMapLabel = "Carte / localisation";
