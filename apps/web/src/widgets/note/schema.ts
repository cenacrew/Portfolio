import { z } from "zod";

export const noteSchema = z.object({
  text: z.string().min(1),
  tone: z.enum(["cream", "blue", "amber", "rose"]).default("cream"),
  signature: z.string().optional(),
});

export type NoteConfig = z.infer<typeof noteSchema>;

export const noteDefault: NoteConfig = {
  text: "Écris un petit mot ici…",
  tone: "cream",
};

export const noteLabel = "Note (post-it)";
