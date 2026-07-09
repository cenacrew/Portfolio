import { z } from "zod";

export const photoSchema = z.object({
  images: z
    .array(
      z.object({
        src: z.string().min(1),
        alt: z.string().default(""),
        caption: z.string().optional(),
      }),
    )
    .min(1),
});

export type PhotoConfig = z.infer<typeof photoSchema>;

export const photoDefault: PhotoConfig = {
  images: [{ src: "/files/img/pp.png", alt: "" }],
};

export const photoLabel = "Photo / mini-galerie";
