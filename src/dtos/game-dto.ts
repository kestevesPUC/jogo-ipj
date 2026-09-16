import { z } from "zod";

export const createGameSchema = z.object({
  title: z.string().min(2).max(120),
  themeId: z.string().min(1),
  questionCount: z.number().int().min(1).max(100),
  specialBlockPercent: z.number().int().min(0).max(50),
  teams: z
    .array(z.object({ name: z.string().min(1).max(60), color: z.string().min(1).max(20) }))
    .min(2)
    .max(10),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
