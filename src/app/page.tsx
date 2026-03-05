"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createSession,
  getSession,
} from "@/entities/session/repo/session.repo";
import { setPendingSessionId } from "@/lib/pending-session";

const SESSION_SHELL_PREFETCH_PATH =
  "/session/11111111-1111-1111-1111-111111111111";
const OFFLINE_SESSION_SHELL_ID = "11111111-1111-1111-1111-111111111111";

export default function Home() {
  const router = useRouter();
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/routines");
    router.prefetch("/session/new");
    router.prefetch(SESSION_SHELL_PREFETCH_PATH);
  }, [router]);

  const handleStartSession = async () => {
    if (isStartingSession) return;

    const shouldUseOfflineSessionShell =
      typeof navigator !== "undefined" && navigator.onLine === false;
    const sessionId = shouldUseOfflineSessionShell
      ? OFFLINE_SESSION_SHELL_ID
      : crypto.randomUUID();

    setIsStartingSession(true);
    setErrorMessage(null);

    try {
      const existingSession = await getSession(sessionId);
      if (!existingSession) {
        await createSession({
          id: sessionId,
          routineId: null,
        });
      }
      setPendingSessionId(sessionId);
      router.push(`/session/${sessionId}`);
    } catch {
      setErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      setIsStartingSession(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Workout PWA</CardTitle>
          <CardDescription>원하는 작업을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            type="button"
            disabled={isStartingSession}
            onClick={() => {
              void handleStartSession();
            }}
          >
            {isStartingSession ? "세션 시작 중..." : "세션 시작"}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/routines">루틴 보기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/routines/new">루틴 추가</Link>
          </Button>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
