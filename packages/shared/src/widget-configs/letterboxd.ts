import { z } from "zod";

export const letterboxdSchema = z.object({
  // The Letterboxd username; its public RSS feed drives the widget.
  username: z.string().min(1).default("cenacrew"),
});

export type LetterboxdConfig = z.infer<typeof letterboxdSchema>;

export const letterboxdDefault: LetterboxdConfig = {
  username: "cenacrew",
};

export const letterboxdLabel = "Letterboxd";
