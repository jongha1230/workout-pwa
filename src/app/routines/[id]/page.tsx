"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Play,
  Rows3,
  Trash2,
} from "lucide-react";

import {
  EmptyStatePanel,
  PageShell,
  SectionHeading,
  StatPill,
} from "@/components/brand/page-shell";
import { RoutineTemplateForm } from "@/components/routine/routine-template-form";
import { useStartSession } from "@/components/session/use-start-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteRoutine,
  getRoutine,
  updateRoutine,
} from "@/entities/routine/repo/routine.repo";
import {
  deleteSession,
  listSessionsByRoutine,
} from "@/entities/session/repo/session.repo";
import type { RoutineRecord, SessionRecord } from "@/lib/db";

const formatDateTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

const SESSION_SHELL_PREFETCH_PATH =
  "/session/11111111-1111-1111-1111-111111111111";

export default function RoutineDetailPage() {
  const { id: routineId } = useParams<{ id: string }>();
  const router = useRouter();
  const sessionStart = useStartSession();

  const [routine, setRoutine] = useState<RoutineRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!routineId) return;

    let cancelled = false;

    void Promise.all([getRoutine(routineId), listSessionsByRoutine(routineId)])
      .then(([loadedRoutine, loadedSessions]) => {
        if (cancelled) return;

        if (!loadedRoutine) {
          setErrorMessage("루틴을 찾을 수 없습니다.");
          setRoutine(null);
          setSessions([]);
          return;
        }

        setRoutine(loadedRoutine);
        setSessions(loadedSessions);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage("루틴 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routineId]);

  useEffect(() => {
    router.prefetch(SESSION_SHELL_PREFETCH_PATH);
  }, [router]);

  const handleDeleteSession = async (sessionId: string) => {
    if (deletingSessionId) return;

    const shouldDelete = window.confirm("이 세션을 삭제할까요?");
    if (!shouldDelete) return;

    setDeletingSessionId(sessionId);
    setErrorMessage(null);

    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } catch {
      setErrorMessage("세션 삭제에 실패했습니다.");
    } finally {
      setDeletingSessionId((prev) => (prev === sessionId ? null : prev));
    }
  };

  const handleDeleteRoutine = async () => {
    if (!routine || isDeletingRoutine) return;

    const shouldDelete = window.confirm(
      "루틴을 삭제하면 저장된 세션도 함께 삭제됩니다. 계속할까요?",
    );
    if (!shouldDelete) return;

    setIsDeletingRoutine(true);
    setErrorMessage(null);

    try {
      await deleteRoutine(routine.id);
      router.push("/routines");
    } catch {
      setErrorMessage("루틴 삭제에 실패했습니다.");
      setIsDeletingRoutine(false);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/session/${encodeURIComponent(sessionId)}`);
  };

  const handleStartSession = async () => {
    if (!routine) return;
    setErrorMessage(null);
    await sessionStart.startRoutineSession(routine.id);
  };

  const totalSets = sessions.reduce(
    (sum, session) => sum + session.sets.length,
    0,
  );
  const completedSets = sessions.reduce(
    (sum, session) =>
      sum + session.sets.filter((setItem) => setItem.completed ?? false).length,
    0,
  );
  const completionRate =
    totalSets === 0
      ? "0%"
      : `${Math.round((completedSets / totalSets) * 100)}%`;
  const plannedExerciseCount = routine?.exercises.length ?? 0;
  const plannedTargetSets =
    routine?.exercises.reduce(
      (sum, exercise) => sum + exercise.targetSets,
      0,
    ) ?? 0;

  return (
    <PageShell
      density="compact"
      eyebrow="Routine Detail"
      title={routine?.name ?? "루틴 상세"}
      description={
        routine?.description ??
        "저장된 세션을 다시 열어 흐름을 확인하고, 같은 루틴으로 새 세션을 바로 시작할 수 있습니다."
      }
      actions={
        <>
          <Button asChild size="lg" variant="outline">
            <Link href="/routines">
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Link>
          </Button>
          {routine ? (
            <>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => {
                  setIsEditingRoutine((prev) => !prev);
                  setErrorMessage(null);
                }}
              >
                {isEditingRoutine ? "편집 닫기" : "루틴 편집"}
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={sessionStart.startingRoutineId === routine.id}
                onClick={() => {
                  void handleStartSession();
                }}
              >
                <Play className="h-4 w-4" />
                {sessionStart.startingRoutineId === routine.id
                  ? "세션 시작 중..."
                  : "이 루틴으로 시작"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="destructive"
                disabled={isDeletingRoutine}
                onClick={() => {
                  void handleDeleteRoutine();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingRoutine ? "루틴 삭제 중..." : "루틴 삭제"}
              </Button>
            </>
          ) : null}
        </>
      }
      meta={
        <>
          <StatPill
            label="Sessions"
            value={isLoading ? "Loading..." : `${sessions.length} saved`}
            icon={CalendarClock}
          />
          <StatPill label="Sets" value={`${totalSets} logged`} icon={Rows3} />
          <StatPill
            label="Completion"
            value={`${completedSets}/${totalSets || 0} · ${completionRate}`}
            icon={Activity}
          />
        </>
      }
    >
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            루틴 불러오는 중...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && sessionStart.actionErrorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {sessionStart.actionErrorMessage}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && routine ? (
        <section className="space-y-4">
          {isEditingRoutine ? (
            <Card>
              <CardContent className="pt-6">
                <RoutineTemplateForm
                  initialValue={routine}
                  submitLabel="루틴 저장"
                  submittingLabel="저장 중..."
                  onCancel={() => {
                    setIsEditingRoutine(false);
                    setErrorMessage(null);
                  }}
                  onSubmit={async (input) => {
                    const updated = await updateRoutine(routine.id, input);

                    if (!updated) {
                      throw new Error("루틴을 찾을 수 없습니다.");
                    }

                    setRoutine(updated);
                    setIsEditingRoutine(false);
                    setErrorMessage(null);
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Routine Template"
              title="운동 템플릿"
              description={`이 루틴은 ${plannedExerciseCount}개의 운동 블록과 ${plannedTargetSets}개 목표 세트를 담고 있습니다.`}
            />

            {routine.exercises.length === 0 ? (
              <EmptyStatePanel
                title="아직 운동 템플릿이 없습니다."
                description="기존 루틴 데이터일 가능성이 있습니다. 루틴 편집에서 운동 블록을 추가하면, 이후 세션 시작 흐름에 연결할 수 있는 구조가 생깁니다."
                action={
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditingRoutine(true);
                      setErrorMessage(null);
                    }}
                  >
                    운동 템플릿 추가
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4">
                {routine.exercises.map((exercise, index) => (
                  <Card key={exercise.id}>
                    <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <span className="brand-kicker">
                          Exercise {index + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                            {exercise.name}
                          </p>
                          <p className="text-sm text-white/54">
                            목표 세트 {exercise.targetSets}개
                          </p>
                        </div>
                      </div>

                      <div className="max-w-xl space-y-3">
                        <span className="hud-chip inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/62">
                          Ordered template block
                        </span>
                        <p className="text-sm leading-7 text-white/56">
                          {exercise.note ??
                            "추가 메모는 없습니다. 필요한 경우 템포, 워밍업 규칙, 장비 조건을 남길 수 있습니다."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <SectionHeading
            eyebrow="Saved Sessions"
            title="저장된 세션"
            description="최근 세션부터 다시 확인하고, 개별 세션 카드를 눌러 편집 화면으로 돌아갈 수 있습니다."
            action={
              sessions.length > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/session/${sessions[0].id}`}>
                    가장 최근 세션 열기
                  </Link>
                </Button>
              ) : null
            }
          />

          {sessions.length === 0 ? (
            <EmptyStatePanel
              title="아직 저장된 세션이 없습니다."
              description="루틴 상세 화면은 단순 조회보다 행동 유도에 가깝게 보여야 합니다. 첫 세션을 시작해 루틴과 세션이 자연스럽게 이어지는 흐름을 만들어 주세요."
              action={
                <Button
                  type="button"
                  onClick={() => {
                    void handleStartSession();
                  }}
                >
                  첫 세션 시작하기
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {sessions.map((session, index) => {
                const completedCount = session.sets.filter(
                  (setItem) => setItem.completed ?? false,
                ).length;
                return (
                  <Card
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(19,25,14,0.12)]"
                    onClick={() => handleOpenSession(session.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenSession(session.id);
                      }
                    }}
                  >
                    <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <span className="brand-kicker">
                          Session {sessions.length - index}
                        </span>
                        <div className="space-y-1">
                          <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-foreground">
                            {formatDateTime(session.updatedAt)}
                          </p>
                          <p className="text-sm text-white/54">
                            세트 {session.sets.length}개 · 완료 {completedCount}
                            /{session.sets.length}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/62">
                          Re-open session
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={deletingSessionId === session.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSession(session.id);
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingSessionId === session.id
                            ? "삭제 중..."
                            : "삭제"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </PageShell>
  );
}
