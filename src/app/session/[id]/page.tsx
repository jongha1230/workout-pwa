"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { SetInputSchema } from "@/entities/model/session/model/set.schema";
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

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>();

  const setsFromStore = useSessionStore((state) => state.sessions[sessionId]);
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const addSet = useSessionStore((state) => state.addSet);
  const removeSet = useSessionStore((state) => state.removeSet);
  const replaceSets = useSessionStore((state) => state.replaceSets);

  // store 데이터와 분리된 입력용 draft 상태
  const [draftBySetId, setDraftBySetId] = useState<Record<string, DraftSet>>(
    {},
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

  const handleAddSet = () => {
    if (!sessionId) return;
    // 새 세트 추가 후 draft 상태 업데이트 (weight: "", reps: "")
    const lastSet = safeSets.at(-1);
    const lastDraft = lastSet ? draftBySetId[lastSet.id] : undefined;
    const initialWeight = Number(
      lastDraft?.weight ?? (lastSet ? String(lastSet.weight) : "0"),
    );
    const initialReps = Number(
      lastDraft?.reps ?? (lastSet ? String(lastSet.reps) : "1"),
    );
    const resolvedWeight =
      Number.isFinite(initialWeight) && initialWeight >= 0 ? initialWeight : 0;
    const resolvedReps =
      Number.isInteger(initialReps) && initialReps >= 1 ? initialReps : 1;
    const newId = addSet(sessionId, {
      weight: resolvedWeight,
      reps: resolvedReps,
    });

    setDraftBySetId((prev) => ({
      ...prev,
      [newId]: {
        weight: String(resolvedWeight),
        reps: String(resolvedReps),
      },
    }));
  };

  const handleChange = (
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    // draft 상태 업데이트 (weight: value, reps: value)
    setDraftBySetId((prev) => {
      const current = prev[setId] ?? { weight: "", reps: "" };
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
    removeSet(sessionId, setId);

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
      const parsed = SetInputSchema.safeParse({
        weight: draft?.weight ?? String(item.weight),
        reps: draft?.reps ?? String(item.reps),
      });

      if (!parsed.success) {
        setErrorMessage(
          `세트 ${index + 1}: ${parsed.error.issues[0]?.message ?? "입력값 오류"}`,
        );
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
  };

  if (!sessionId) {
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>세션 ID가 없습니다</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (isHydrating) {
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>세션 불러오는 중...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
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
              const isLastSet = index === safeSets.length - 1;
              return (
                <Card
                  key={item.id}
                  className={cn(
                    isLastSet &&
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
                        value={draft?.weight ?? String(item.weight)}
                        onChange={(event) =>
                          handleChange(item.id, "weight", event.target.value)
                        }
                      />
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="횟수 (예: 10)"
                        value={draft?.reps ?? String(item.reps)}
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
  );
}
