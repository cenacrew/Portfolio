import { z } from "zod";

export const visitorCounterSchema = z.object({
  count: z.number().int().nonnegative(),
  label: z.string().default("visites"),
});

export type VisitorCounterConfig = z.infer<typeof visitorCounterSchema>;

export const visitorCounterDefault: VisitorCounterConfig = {
  count: 0,
  label: "visites",
};

export const visitorCounterLabel = "Compteur de visites";
