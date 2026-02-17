"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteSession,
  listSessionsByRoutine,
} from "@/entities/session/repo/session.repo";
import { ROUTINES } from "@/lib/constants";
import type { SessionRecord } from "@/lib/db";

type SessionsByRoutine = Record<string, SessionRecord[]>;

const formatSessionLabel = (session: SessionRecord) =>
  new Date(session.updatedAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RoutinesPage() {
  const [sessionsByRoutine, setSessionsByRoutine] = useState<SessionsByRoutine>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const entries = await Promise.all(
          ROUTINES.map(async (routine) => {
            const sessions = await listSessionsByRoutine(routine.id);
            return [routine.id, sessions] as const;
          }),
        );
        if (cancelled) return;
        setSessionsByRoutine(Object.fromEntries(entries));
      } catch {
        if (cancelled) return;
        setErrorMessage("세션 목록을 불러오지 못했습니다.");
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteSession = async (routineId: string, sessionId: string) => {
    setDeletingSessionId(sessionId);
    setErrorMessage(null);

    try {
      await deleteSession(sessionId);
      setSessionsByRoutine((prev) => ({
        ...prev,
        [routineId]: (prev[routineId] ?? []).filter(
          (session) => session.id !== sessionId,
        ),
      }));
    } catch {
      setErrorMessage("세션 삭제에 실패했습니다.");
    } finally {
      setDeletingSessionId((prev) => (prev === sessionId ? null : prev));
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">루틴</h1>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {ROUTINES.map((routine) => {
        const sessions = sessionsByRoutine[routine.id] ?? [];
        return (
          <Card key={routine.id}>
            <CardHeader>
              <CardTitle>{routine.name}</CardTitle>
              <CardDescription>{routine.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild>
                <Link
                  href={`/session/new?routineId=${encodeURIComponent(routine.id)}`}
                >
                  이 루틴으로 시작
                </Link>
              </Button>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">저장된 세션</p>
                {isLoading ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    세션 불러오는 중...
                  </p>
                ) : sessions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    아직 저장된 세션이 없습니다.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {routine.name} · {formatSessionLabel(session)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            세트 {session.sets.length}개 · ID{" "}
                            {session.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/session/${session.id}`}>열기</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingSessionId === session.id}
                            onClick={() =>
                              handleDeleteSession(routine.id, session.id)
                            }
                          >
                            {deletingSessionId === session.id
                              ? "삭제 중..."
                              : "삭제"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
