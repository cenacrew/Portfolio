import { z } from "zod";

export const weatherSchema = z.object({
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  // Phase 4.10 A7: by default the widget follows the admin's presence
  // (device coords/city written to site_settings on app launch), like the map's
  // "ma-loc" mode. Turn off to pin a fixed city (city/lat/lng below).
  followPresence: z.boolean().default(true),
});

export type WeatherConfig = z.infer<typeof weatherSchema>;

export const weatherDefault: WeatherConfig = {
  city: "Bordeaux",
  lat: 44.8378,
  lng: -0.5792,
  followPresence: true,
};

export const weatherLabel = "Météo locale";
