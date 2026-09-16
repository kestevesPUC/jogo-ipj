import { z } from "zod";

export const createThemeSchema = z.object({
  name: z.string().min(2).max(120),
});

export type CreateThemeInput = z.infer<typeof createThemeSchema>;
