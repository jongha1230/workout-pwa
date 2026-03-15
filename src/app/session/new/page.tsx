"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Play, Sparkles } from "lucide-react";

import { PageShell, StatPill } from "@/components/brand/page-shell";
import { Button } from "@/components/ui/button";
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
    <PageShell
      density="compact"
      eyebrow="Fallback Entry"
      title="새 세션"
      description={
        routineId
          ? `선택된 루틴을 기준으로 새 세션을 시작합니다. 현재 선택: ${selectedRoutineName}`
          : "루틴 없이 바로 세션을 시작합니다."
      }
      actions={
        <Button onClick={handleStart} disabled={isStarting}>
          <Play className="h-4 w-4" />
          {isStarting ? "세션 시작 중..." : "세션 시작"}
        </Button>
      }
      meta={
        <>
          <StatPill
            label="Entry"
            value={routineId ? "Routine-based" : "Quick start"}
            icon={Compass}
          />
          <StatPill label="Routing" value="Fallback path" icon={Sparkles} />
          <StatPill label="Next" value="Open editor" icon={Play} />
        </>
      }
    >
      {errorMessage ? (
        <p className="rounded-[1.2rem] border border-destructive/20 bg-red-50/70 px-4 py-3 text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </PageShell>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl p-4" />}>
      <NewSessionContent />
    </Suspense>
  );
}
