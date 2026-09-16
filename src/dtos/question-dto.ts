import { z } from "zod";

export const questionSchema = z.object({
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1).max(500),
  mediaType: z.enum(["none", "image", "gif", "video"]).default("none"),
  mediaSource: z.enum(["upload", "url"]).nullable().default(null),
  mediaValue: z.string().nullable().default(null),
});

export type QuestionInputDto = z.infer<typeof questionSchema>;
