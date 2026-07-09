import { z } from "zod";

export const pollSchema = z.object({
  question: z.string().min(1),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        votes: z.number().int().nonnegative().default(0),
      }),
    )
    .min(2),
});

export type PollConfig = z.infer<typeof pollSchema>;

export const pollDefault: PollConfig = {
  question: "Ta question ?",
  options: [
    { id: "a", label: "Option A", votes: 0 },
    { id: "b", label: "Option B", votes: 0 },
  ],
};

export const pollLabel = "Sondage";
