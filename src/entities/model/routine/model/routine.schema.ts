import { z } from "zod";

const MAX_ROUTINE_NAME_LENGTH = 80;
const MAX_ROUTINE_DESCRIPTION_LENGTH = 280;
const MAX_EXERCISE_NAME_LENGTH = 80;
const MAX_EXERCISE_NOTE_LENGTH = 200;

const optionalTextToNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const RoutineExerciseTemplateSchema = z.object({
  id: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(1, "운동 이름을 입력해 주세요.")
    .max(MAX_EXERCISE_NAME_LENGTH, "운동 이름은 80자 이하여야 합니다."),
  order: z.coerce.number().int().min(0),
  targetSets: z.coerce
    .number()
    .int()
    .min(1, "목표 세트 수는 1 이상이어야 합니다.")
    .max(20, "목표 세트 수는 20 이하여야 합니다."),
  note: z
    .preprocess(
      optionalTextToNull,
      z
        .string()
        .max(MAX_EXERCISE_NOTE_LENGTH, "운동 메모는 200자 이하여야 합니다.")
        .nullable(),
    )
    .default(null),
});

export const RoutineTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "루틴 이름을 입력해 주세요.")
    .max(MAX_ROUTINE_NAME_LENGTH, "루틴 이름은 80자 이하여야 합니다."),
  description: z
    .preprocess(
      optionalTextToNull,
      z
        .string()
        .max(
          MAX_ROUTINE_DESCRIPTION_LENGTH,
          "루틴 설명은 280자 이하여야 합니다.",
        )
        .nullable(),
    )
    .default(null),
  exercises: z
    .array(RoutineExerciseTemplateSchema)
    .min(1, "운동을 1개 이상 추가해 주세요."),
});

export type RoutineExerciseTemplateInput = z.infer<
  typeof RoutineExerciseTemplateSchema
>;
export type RoutineTemplateInput = z.infer<typeof RoutineTemplateSchema>;
