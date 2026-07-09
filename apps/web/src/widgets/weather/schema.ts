import { z } from "zod";

export const weatherSchema = z.object({
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

export type WeatherConfig = z.infer<typeof weatherSchema>;

export const weatherDefault: WeatherConfig = {
  city: "Bordeaux",
  lat: 44.8378,
  lng: -0.5792,
};

export const weatherLabel = "Météo locale";
