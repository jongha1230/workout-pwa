"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Play, Sparkles } from "lucide-react";

import { PageShell, StatPill } from "@/components/brand/page-shell";
import { useStartSession } from "@/components/session/use-start-session";
import { Button } from "@/components/ui/button";
import { getRoutine } from "@/entities/routine/repo/routine.repo";

const SESSION_SHELL_PREFETCH_PATH =
  "/session/11111111-1111-1111-1111-111111111111";

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routineId = searchParams.get("routineId");
  const normalizedRoutineId =
    routineId && routineId.trim().length > 0 ? routineId : null;
  const sessionStart = useStartSession({ markPendingQuickSession: false });
  const [routineName, setRoutineName] = useState<string | null>(null);
  const selectedRoutineName = routineId ? (routineName ?? routineId) : null;
  const isStarting = normalizedRoutineId
    ? sessionStart.startingRoutineId === normalizedRoutineId
    : sessionStart.isStartingQuickSession;

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

  useEffect(() => {
    router.prefetch(SESSION_SHELL_PREFETCH_PATH);
  }, [router]);

  const handleStart = async () => {
    if (normalizedRoutineId) {
      await sessionStart.startRoutineSession(normalizedRoutineId);
      return;
    }

    await sessionStart.startQuickSession();
  };

  return (
    <PageShell
      density="compact"
      eyebrow="세션 시작"
      title="새 세션"
      description={
        routineId
          ? `${selectedRoutineName} 루틴으로 새 세션을 시작합니다.`
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
            label="방식"
            value={routineId ? "루틴으로 시작" : "빠르게 시작"}
            icon={Compass}
          />
          <StatPill label="경로" value="직접 진입" icon={Sparkles} />
          <StatPill label="다음" value="기록 화면 열기" icon={Play} />
        </>
      }
    >
      {sessionStart.actionErrorMessage ? (
        <p className="rounded-[1.2rem] border border-destructive/20 bg-red-50/70 px-4 py-3 text-sm font-medium text-destructive">
          {sessionStart.actionErrorMessage}
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
