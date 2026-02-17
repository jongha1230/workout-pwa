"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import { SetInputSchema } from "@/entities/model/session/model/set.schema";
import {
  getLatestSessionByRoutine,
  getSession,
} from "@/entities/session/repo/session.repo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSessionStore, type SessionSet } from "@/store/session.store";

type DraftSet = {
  weight: string;
  reps: string;
};

type SetSeed = {
  weight: number;
  reps: number;
};

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const setsFromStore = useSessionStore((state) => state.sessions[sessionId]);
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const addSet = useSessionStore((state) => state.addSet);
  const removeSet = useSessionStore((state) => state.removeSet);
  const replaceSets = useSessionStore((state) => state.replaceSets);

  // store 데이터와 분리된 입력용 draft 상태
  const [draftBySetId, setDraftBySetId] = useState<Record<string, DraftSet>>(
    {},
  );
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [latestRoutineSeed, setLatestRoutineSeed] = useState<SetSeed | null>(
    null,
  );
  const [isHydrating, setIsHydrating] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeSets = setsFromStore ?? [];

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    void hydrateSession(sessionId)
      .catch(() => {
        if (cancelled) return;
        setErrorMessage("세션 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrateSession, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const loadRoutineSeed = async () => {
      try {
        const currentSession = await getSession(sessionId);
        if (!currentSession?.routineId) {
          if (!cancelled) {
            setLatestRoutineSeed(null);
          }
          return;
        }

        const latestRoutineSession = await getLatestSessionByRoutine(
          currentSession.routineId,
          {
            excludeSessionId: sessionId,
            requireSets: true,
          },
        );

        if (cancelled || !latestRoutineSession) {
          if (!cancelled) {
            setLatestRoutineSeed(null);
          }
          return;
        }

        const lastSet = latestRoutineSession.sets.at(-1);
        if (!lastSet) {
          if (!cancelled) {
            setLatestRoutineSeed(null);
          }
          return;
        }

        if (!cancelled) {
          setLatestRoutineSeed({
            weight: lastSet.weight,
            reps: lastSet.reps,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLatestRoutineSeed(null);
        }
        console.error("Failed to load latest routine seed.", error);
      }
    };

    void loadRoutineSeed();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleAddSet = () => {
    if (!sessionId) return;
    // 새 세트 추가 후 draft 상태 업데이트
    const lastSet = safeSets.at(-1);
    const lastDraft = lastSet ? draftBySetId[lastSet.id] : undefined;
    const fallbackWeightText = latestRoutineSeed
      ? String(latestRoutineSeed.weight)
      : "";
    const fallbackRepsText = latestRoutineSeed
      ? String(latestRoutineSeed.reps)
      : "";
    const initialWeightText =
      lastDraft?.weight?.trim() && lastDraft.weight.trim().length > 0
        ? lastDraft.weight
        : lastSet
          ? String(lastSet.weight)
          : fallbackWeightText;
    const initialRepsText =
      lastDraft?.reps?.trim() && lastDraft.reps.trim().length > 0
        ? lastDraft.reps
        : lastSet
          ? String(lastSet.reps)
          : fallbackRepsText;
    const initialWeight = Number(
      initialWeightText.length > 0 ? initialWeightText : "0",
    );
    const initialReps = Number(
      initialRepsText.length > 0 ? initialRepsText : "1",
    );
    const resolvedWeight =
      Number.isFinite(initialWeight) && initialWeight >= 0 ? initialWeight : 0;
    const resolvedReps =
      Number.isInteger(initialReps) && initialReps >= 1 ? initialReps : 1;
    const newId = addSet(
      sessionId,
      {
        weight: resolvedWeight,
        reps: resolvedReps,
      },
      { persist: false },
    );

    setDraftBySetId((prev) => ({
      ...prev,
      [newId]: {
        weight: initialWeightText,
        reps: initialRepsText,
      },
    }));
    setActiveSetId(newId);
  };

  const handleChange = (
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    // draft 상태 업데이트 (weight: value, reps: value)
    setDraftBySetId((prev) => {
      const baseSet = safeSets.find((item) => item.id === setId);
      const current = prev[setId] ?? {
        weight: baseSet ? String(baseSet.weight) : "",
        reps: baseSet ? String(baseSet.reps) : "",
      };
      return {
        ...prev,
        [setId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleRemoveSet = (setId: string) => {
    if (!sessionId) return;
    // 세트 삭제 후 draft 상태 업데이트 (weight: "", reps: "")
    removeSet(sessionId, setId, { persist: false });

    setDraftBySetId((prev) => {
      const next = { ...prev };
      delete next[setId];
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) return;

    const nextSets: SessionSet[] = [];

    for (let index = 0; index < safeSets.length; index += 1) {
      const item = safeSets[index];
      const draft = draftBySetId[item.id];
      const weightValue = draft?.weight ?? String(item.weight);
      const repsValue = draft?.reps ?? String(item.reps);

      if (draft && (weightValue.trim() === "" || repsValue.trim() === "")) {
        const message = `세트 ${index + 1}: 중량과 횟수를 입력해 주세요.`;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const parsed = SetInputSchema.safeParse({
        weight: weightValue,
        reps: repsValue,
      });

      if (!parsed.success) {
        const message = `세트 ${index + 1}: ${parsed.error.issues[0]?.message ?? "입력값 오류"}`;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      nextSets.push({
        id: item.id,
        weight: parsed.data.weight,
        reps: parsed.data.reps,
      });
    }

    replaceSets(sessionId, nextSets);
    setErrorMessage(null);
    toast.success("Saved session successfully");
    router.push("/");
  };

  if (!sessionId) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="mx-auto w-full max-w-xl p-4">
          <Card>
            <CardHeader>
              <CardTitle>세션 ID가 없습니다</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </>
    );
  }

  if (isHydrating) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="mx-auto w-full max-w-xl p-4">
          <Card>
            <CardHeader>
              <CardTitle>세션 불러오는 중...</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>세션 {sessionId}</CardTitle>
            <CardDescription>
              세트를 여러 개 추가/수정/삭제할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <Button type="button" variant="outline" onClick={handleAddSet}>
                세트 추가
              </Button>

              {safeSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  세트를 추가해 주세요.
                </p>
              ) : null}

              {safeSets.map((item, index) => {
                const draft = draftBySetId[item.id];
                const currentWeight = draft?.weight ?? String(item.weight);
                const currentReps = draft?.reps ?? String(item.reps);
                const isActive = activeSetId === item.id;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      isActive &&
                        "border-primary bg-primary/5 ring-primary/30 ring-1",
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">세트 {index + 1}</p>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          placeholder="중량 (예: 60)"
                          value={currentWeight}
                          autoFocus={isActive}
                          onFocus={() => setActiveSetId(item.id)}
                          onChange={(event) =>
                            handleChange(item.id, "weight", event.target.value)
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="횟수 (예: 10)"
                          value={currentReps}
                          onFocus={() => setActiveSetId(item.id)}
                          onChange={(event) =>
                            handleChange(item.id, "reps", event.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleRemoveSet(item.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : null}

              <Button type="submit">저장</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
