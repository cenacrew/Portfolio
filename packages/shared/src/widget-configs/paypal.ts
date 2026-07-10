import { z } from "zod";

export const paypalSchema = z.object({
  // The paypal.me handle (the part after paypal.me/).
  handle: z.string().min(1).default("valentinargent"),
  title: z.string().default("Offrir un café"),
  subtitle: z.string().default("Un petit coup de pouce, si le cœur t'en dit."),
});

export type PaypalConfig = z.infer<typeof paypalSchema>;

export const paypalDefault: PaypalConfig = {
  handle: "valentinargent",
  title: "Offrir un café",
  subtitle: "Un petit coup de pouce, si le cœur t'en dit.",
};

export const paypalLabel = "Don PayPal";
