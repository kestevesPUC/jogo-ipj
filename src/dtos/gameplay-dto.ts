import { z } from "zod";

export const adjustScoreSchema = z.object({
  teamId: z.string().min(1),
  delta: z.number().int().min(-1000).max(1000),
});

export type AdjustScoreInput = z.infer<typeof adjustScoreSchema>;
