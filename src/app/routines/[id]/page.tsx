"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteRoutine,
  getRoutine,
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

export default function RoutineDetailPage() {
  const { id: routineId } = useParams<{ id: string }>();
  const router = useRouter();

  const [routine, setRoutine] = useState<RoutineRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);
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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">루틴 상세</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/routines">목록으로</Link>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            루틴 불러오는 중...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && errorMessage ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && routine ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{routine.name}</CardTitle>
              <CardDescription>
                {routine.description ?? "설명이 없습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  href={`/session/new?routineId=${encodeURIComponent(routine.id)}`}
                >
                  이 루틴으로 시작
                </Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingRoutine}
                onClick={() => {
                  void handleDeleteRoutine();
                }}
              >
                {isDeletingRoutine ? "루틴 삭제 중..." : "루틴 삭제"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>저장된 세션</CardTitle>
              <CardDescription>
                최근 저장된 세션부터 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 저장된 세션이 없습니다.
                </p>
              ) : (
                sessions.map((session, index) => {
                  const completedCount = session.sets.filter(
                    (setItem) => setItem.completed ?? false,
                  ).length;
                  return (
                    <Card
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => handleOpenSession(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenSession(session.id);
                        }
                      }}
                    >
                      <CardContent className="flex items-center justify-between gap-3 pt-6">
                        <div className="flex flex-col gap-1 text-sm">
                          <p className="font-medium">
                            세션 {sessions.length - index}
                          </p>
                          <p className="text-muted-foreground">
                            {formatDateTime(session.updatedAt)}
                          </p>
                          <p className="text-muted-foreground">
                            세트 {session.sets.length}개
                          </p>
                          <p className="text-muted-foreground">
                            완료 {completedCount}/{session.sets.length}
                          </p>
                        </div>
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
                          {deletingSessionId === session.id
                            ? "삭제 중..."
                            : "삭제"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}
