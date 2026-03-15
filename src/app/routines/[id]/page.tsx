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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteRoutine,
  getRoutine,
  updateRoutine,
} from "@/entities/routine/repo/routine.repo";
import {
  createSession,
  deleteSession,
  listSessionsByRoutine,
} from "@/entities/session/repo/session.repo";
import type { RoutineRecord, SessionRecord } from "@/lib/db";

const formatDateTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

export default function RoutineDetailPage() {
  const { id: routineId } = useParams<{ id: string }>();
  const router = useRouter();

  const [routine, setRoutine] = useState<RoutineRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

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
        setDraftName(loadedRoutine.name);
        setDraftDescription(loadedRoutine.description ?? "");
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

  const handleSaveRoutine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!routine || isSavingRoutine) return;

    const trimmedName = draftName.trim();
    if (trimmedName.length === 0) {
      setErrorMessage("루틴 이름을 입력해 주세요.");
      return;
    }

    setIsSavingRoutine(true);
    setErrorMessage(null);

    try {
      const updated = await updateRoutine(routine.id, {
        name: trimmedName,
        description: draftDescription,
      });

      if (!updated) {
        setErrorMessage("루틴을 찾을 수 없습니다.");
        return;
      }

      setRoutine(updated);
      setDraftName(updated.name);
      setDraftDescription(updated.description ?? "");
      setIsEditingRoutine(false);
    } catch {
      setErrorMessage("루틴 수정에 실패했습니다.");
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleStartSession = async () => {
    if (!routine || isStartingSession) return;

    const sessionId = crypto.randomUUID();

    setIsStartingSession(true);
    setErrorMessage(null);

    try {
      await createSession({
        id: sessionId,
        routineId: routine.id,
      });
      router.push(`/session/${sessionId}`);
    } catch {
      setErrorMessage("세션 생성에 실패했습니다.");
      setIsStartingSession(false);
    }
  };

  const totalSets = sessions.reduce((sum, session) => sum + session.sets.length, 0);
  const completedSets = sessions.reduce(
    (sum, session) =>
      sum +
      session.sets.filter((setItem) => setItem.completed ?? false).length,
    0,
  );
  const completionRate =
    totalSets === 0 ? "0%" : `${Math.round((completedSets / totalSets) * 100)}%`;

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
                disabled={isStartingSession}
                onClick={() => {
                  void handleStartSession();
                }}
              >
                <Play className="h-4 w-4" />
                {isStartingSession ? "세션 시작 중..." : "이 루틴으로 시작"}
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

      {!isLoading && routine ? (
        <section className="space-y-4">
          {isEditingRoutine ? (
            <Card>
              <CardContent className="pt-6">
                <form className="flex flex-col gap-4" onSubmit={handleSaveRoutine}>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/74">
                      루틴 이름
                    </span>
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/74">
                      설명
                    </span>
                    <textarea
                      className="glass-field min-h-32 w-full rounded-[1rem] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/36 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={draftDescription}
                      onChange={(event) => setDraftDescription(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" size="sm" disabled={isSavingRoutine}>
                      {isSavingRoutine ? "저장 중..." : "루틴 저장"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDraftName(routine.name);
                        setDraftDescription(routine.description ?? "");
                        setIsEditingRoutine(false);
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <SectionHeading
            eyebrow="Saved Sessions"
            title="저장된 세션"
            description="최근 세션부터 다시 확인하고, 개별 세션 카드를 눌러 편집 화면으로 돌아갈 수 있습니다."
            action={
              sessions.length > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/session/${sessions[0].id}`}>가장 최근 세션 열기</Link>
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
                        <span className="brand-kicker">Session {sessions.length - index}</span>
                        <div className="space-y-1">
                          <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-foreground">
                            {formatDateTime(session.updatedAt)}
                          </p>
                          <p className="text-sm text-white/54">
                            세트 {session.sets.length}개 · 완료 {completedCount}/
                            {session.sets.length}
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
                          {deletingSessionId === session.id ? "삭제 중..." : "삭제"}
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
