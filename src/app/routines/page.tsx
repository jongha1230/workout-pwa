"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  FolderKanban,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import {
  EmptyStatePanel,
  PageShell,
  SectionHeading,
  StatPill,
} from "@/components/brand/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteRoutine,
  listRoutines,
} from "@/entities/routine/repo/routine.repo";
import { createSession } from "@/entities/session/repo/session.repo";
import type { RoutineRecord } from "@/lib/db";

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(
    null,
  );
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listRoutines()
      .then((loadedRoutines) => {
        if (cancelled) return;
        setRoutines(loadedRoutines);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage("루틴 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteRoutine = async (routineId: string) => {
    if (deletingRoutineId) return;

    const shouldDelete = window.confirm(
      "루틴을 삭제하면 저장된 세션도 함께 삭제됩니다. 계속할까요?",
    );
    if (!shouldDelete) return;

    setDeletingRoutineId(routineId);
    setErrorMessage(null);

    try {
      await deleteRoutine(routineId);
      setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
    } catch {
      setErrorMessage("루틴 삭제에 실패했습니다.");
    } finally {
      setDeletingRoutineId((prev) => (prev === routineId ? null : prev));
    }
  };

  const handleStartRoutineSession = async (routineId: string) => {
    if (startingRoutineId) return;

    const sessionId = crypto.randomUUID();

    setStartingRoutineId(routineId);
    setErrorMessage(null);

    try {
      await createSession({
        id: sessionId,
        routineId,
      });
      router.push(`/session/${sessionId}`);
    } catch {
      setErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      setStartingRoutineId((prev) => (prev === routineId ? null : prev));
    }
  };

  return (
    <PageShell
      density="compact"
      eyebrow="Routine Library"
      title="루틴"
      description="이 화면에서는 바로 기록을 시작하는 게 우선입니다. 각 루틴 카드에서 상세를 거치지 않고 바로 세션으로 들어갈 수 있게 정리했습니다."
      actions={
        <>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">
              <Play className="h-4 w-4" />
              빠른 기록
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/routines/new">
              <Plus className="h-4 w-4" />
              루틴 추가
            </Link>
          </Button>
        </>
      }
      meta={
        <>
          <StatPill
            label="Saved"
            value={isLoading ? "Loading..." : `${routines.length} routines`}
            icon={FolderKanban}
          />
          <StatPill label="Action" value="Start from list" icon={Play} />
          <StatPill label="Updated" value="Newest first" icon={Clock3} />
        </>
      }
    >
      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-white/58">
            루틴 불러오는 중...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && routines.length === 0 ? (
        <EmptyStatePanel
          title="아직 루틴이 없습니다."
          description="루틴이 없으면 바로 기록을 시작하거나, 첫 루틴을 하나 만든 뒤 구조화된 흐름을 보여주면 됩니다."
          action={
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/routines/new">루틴 추가</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">빠른 기록으로 이동</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      {!isLoading && routines.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Saved Library"
            title="저장된 루틴"
            description="상세는 기록 이력이 필요할 때만 보고, 보통은 카드에서 바로 세션을 시작하면 됩니다."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {routines.map((routine, index) => (
              <Card
                key={routine.id}
                className="overflow-hidden bg-[linear-gradient(180deg,rgba(9,18,21,0.88),rgba(6,12,15,0.74))]"
              >
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <span className="brand-kicker">Routine 0{index + 1}</span>
                      <CardTitle className="text-3xl">{routine.name}</CardTitle>
                    </div>
                    <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/64">
                      Updated {formatDate(routine.updatedAt)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="min-h-16 text-sm leading-7 text-white/56 sm:text-base">
                    {routine.description ??
                      "설명이 없습니다. 어떤 루틴인지 한 줄만 적어도 선택 흐름이 훨씬 빨라집니다."}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={startingRoutineId === routine.id}
                      onClick={() => {
                        void handleStartRoutineSession(routine.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      {startingRoutineId === routine.id
                        ? "세션 시작 중..."
                        : "이 루틴으로 시작"}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/routines/${routine.id}`}>
                        세션 기록 보기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deletingRoutineId === routine.id}
                      onClick={() => {
                        void handleDeleteRoutine(routine.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingRoutineId === routine.id
                        ? "삭제 중..."
                        : "루틴 삭제"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
