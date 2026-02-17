import { z } from "zod";

export const SetInputSchema = z.object({
  weight: z.coerce.number().min(0, "중량은 0 이상이어야 해요"),
  reps: z.coerce.number().int().min(1, "횟수는 1 이상의 정수여야 해요"),
});

export type SetInput = z.infer<typeof SetInputSchema>;
