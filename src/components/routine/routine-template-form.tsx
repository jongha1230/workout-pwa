"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, ListOrdered, Plus, Trash2 } from "lucide-react";
import { ZodError } from "zod";

import {
  RoutineTemplateSchema,
  type RoutineTemplateInput,
} from "@/entities/model/routine/model/routine.schema";
import type { RoutineExerciseRecord } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ExerciseDraft = {
  id: string;
  name: string;
  targetSets: string;
  note: string;
};

type RoutineTemplateFormProps = {
  initialValue?: {
    name: string;
    description: string | null;
    exercises: RoutineExerciseRecord[];
  };
  seedExerciseOnEmpty?: boolean;
  submitLabel: string;
  submittingLabel: string;
  cancelHref?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit: (input: RoutineTemplateInput) => Promise<void>;
};

const textareaClassName =
  "glass-field min-h-28 w-full rounded-[1.15rem] px-4 py-3 text-sm leading-7 text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/34 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const createEmptyExerciseDraft = (): ExerciseDraft => ({
  id: crypto.randomUUID(),
  name: "",
  targetSets: "3",
  note: "",
});

const toExerciseDraft = (exercise: RoutineExerciseRecord): ExerciseDraft => ({
  id: exercise.id,
  name: exercise.name,
  targetSets: String(exercise.targetSets),
  note: exercise.note ?? "",
});

const moveDraft = (
  drafts: ExerciseDraft[],
  fromIndex: number,
  toIndex: number,
): ExerciseDraft[] => {
  const next = [...drafts];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "루틴 입력값을 다시 확인해 주세요.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "루틴 저장에 실패했습니다. 다시 시도해 주세요.";
};

export function RoutineTemplateForm({
  initialValue,
  seedExerciseOnEmpty = false,
  submitLabel,
  submittingLabel,
  cancelHref,
  cancelLabel = "취소",
  onCancel,
  onSubmit,
}: RoutineTemplateFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>(() => {
    const initialDrafts =
      initialValue?.exercises
        .slice()
        .sort((left, right) => left.order - right.order)
        .map(toExerciseDraft) ?? [];

    if (initialDrafts.length > 0) {
      return initialDrafts;
    }

    return seedExerciseOnEmpty ? [createEmptyExerciseDraft()] : [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddExercise = () => {
    setExerciseDrafts((prev) => [...prev, createEmptyExerciseDraft()]);
    setErrorMessage(null);
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= exerciseDrafts.length) {
      return;
    }

    setExerciseDrafts((prev) => moveDraft(prev, index, nextIndex));
    setErrorMessage(null);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExerciseDrafts((prev) =>
      prev.filter((exercise) => exercise.id !== exerciseId),
    );
    setErrorMessage(null);
  };

  const handleExerciseChange = (
    exerciseId: string,
    field: keyof Omit<ExerciseDraft, "id">,
    value: string,
  ) => {
    setExerciseDrafts((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise,
      ),
    );
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = RoutineTemplateSchema.safeParse({
      name,
      description,
      exercises: exerciseDrafts.map((exercise, index) => ({
        id: exercise.id,
        name: exercise.name,
        order: index,
        targetSets: exercise.targetSets,
        note: exercise.note,
      })),
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "입력값 오류");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white/74">루틴 이름</span>
          <Input
            placeholder="루틴 이름 (예: Upper Body)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/74">루틴 설명</span>
          <textarea
            className={textareaClassName}
            placeholder="설명 (선택)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="brand-kicker">Exercise Template</p>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
              운동 블록
            </h3>
            <p className="text-sm leading-6 text-white/54">
              루틴은 이름만 저장하지 않고, 운동 순서와 목표 세트 수까지 함께
              보관합니다.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAddExercise}
          >
            <Plus className="h-4 w-4" />
            운동 추가
          </Button>
        </div>

        {exerciseDrafts.length === 0 ? (
          <div className="surface-soft rounded-[1.3rem] border border-dashed border-white/12 px-5 py-5 text-sm leading-7 text-white/58">
            아직 운동 블록이 없습니다. 최소 1개의 운동을 추가해야 루틴을 저장할
            수 있습니다.
          </div>
        ) : (
          <div className="grid gap-4">
            {exerciseDrafts.map((exercise, index) => (
              <div
                key={exercise.id}
                className="surface-soft rounded-[1.4rem] px-5 py-5"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="brand-kicker">Exercise {index + 1}</p>
                    <p className="text-sm text-white/54">
                      순서 기반 템플릿. 이후 세션 시작 시 이 구조를 그대로
                      확장할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      aria-label={`운동 ${index + 1} 위로 이동`}
                      disabled={index === 0}
                      onClick={() => handleMoveExercise(index, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      aria-label={`운동 ${index + 1} 아래로 이동`}
                      disabled={index === exerciseDrafts.length - 1}
                      onClick={() => handleMoveExercise(index, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="destructive"
                      aria-label={`운동 ${index + 1} 삭제`}
                      onClick={() => handleRemoveExercise(exercise.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/74">
                      운동 이름
                    </span>
                    <Input
                      placeholder="예: Barbell Bench Press"
                      value={exercise.name}
                      onChange={(event) =>
                        handleExerciseChange(
                          exercise.id,
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-white/74">
                      <ListOrdered className="h-4 w-4 text-primary" />
                      목표 세트 수
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={exercise.targetSets}
                      onChange={(event) =>
                        handleExerciseChange(
                          exercise.id,
                          "targetSets",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-white/74">
                    운동 메모
                  </span>
                  <textarea
                    className={textareaClassName}
                    placeholder="선택 메모 (예: 워밍업 2세트 후 메인 3세트)"
                    value={exercise.note}
                    onChange={(event) =>
                      handleExerciseChange(
                        exercise.id,
                        "note",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      {errorMessage ? (
        <p className="rounded-[1.1rem] border border-destructive/20 bg-destructive/12 px-4 py-3 text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>

        {onCancel ? (
          <Button type="button" size="lg" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}

        {!onCancel && cancelHref ? (
          <Button asChild type="button" size="lg" variant="outline">
            <Link href={cancelHref}>{cancelLabel}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
