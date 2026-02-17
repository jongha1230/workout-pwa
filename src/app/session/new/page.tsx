"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRoutine } from "@/entities/routine/repo/routine.repo";
import { createSession } from "@/entities/session/repo/session.repo";

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routineId = searchParams.get("routineId");
  const [routineName, setRoutineName] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedRoutineName = routineId ? (routineName ?? routineId) : null;

  useEffect(() => {
    if (!routineId) return;

    let cancelled = false;
    void getRoutine(routineId)
      .then((routine) => {
        if (cancelled) return;
        setRoutineName(routine?.name ?? routineId);
      })
      .catch(() => {
        if (cancelled) return;
        setRoutineName(routineId);
      });

    return () => {
      cancelled = true;
    };
  }, [routineId]);

  const handleStart = async () => {
    if (isStarting) return;

    const sessionId = crypto.randomUUID();
    const normalizedRoutineId =
      routineId && routineId.trim().length > 0 ? routineId : null;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      await createSession({
        id: sessionId,
        routineId: normalizedRoutineId,
      });
      router.push(`/session/${sessionId}`);
    } catch {
      setErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      setIsStarting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>새 세션</CardTitle>
          <CardDescription>
            {routineId
              ? `선택된 루틴: ${selectedRoutineName}`
              : "루틴 없이 바로 세션을 시작합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button onClick={handleStart} disabled={isStarting}>
              {isStarting ? "세션 시작 중..." : "세션 시작"}
            </Button>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-xl p-4" />}>
      <NewSessionContent />
    </Suspense>
  );
}
