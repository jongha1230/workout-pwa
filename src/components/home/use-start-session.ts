"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { HomeStartSessionActions } from "@/components/home/home.types";
import { createSession } from "@/entities/session/repo/session.repo";
import { setPendingSessionId } from "@/lib/pending-session";

export function useStartSession(): HomeStartSessionActions {
  const router = useRouter();
  const [isStartingQuickSession, setIsStartingQuickSession] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(
    null,
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null,
  );

  const clearActionError = () => {
    setActionErrorMessage(null);
  };

  const startQuickSession = async () => {
    if (isStartingQuickSession) return;

    const sessionId = crypto.randomUUID();

    setIsStartingQuickSession(true);
    clearActionError();

    try {
      await createSession({
        id: sessionId,
        routineId: null,
      });

      setPendingSessionId(sessionId);
      router.push(`/session/${sessionId}`);
    } catch {
      setActionErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      setIsStartingQuickSession(false);
    }
  };

  const startRoutineSession = async (routineId: string) => {
    if (startingRoutineId) return;

    const sessionId = crypto.randomUUID();

    setStartingRoutineId(routineId);
    clearActionError();

    try {
      await createSession({
        id: sessionId,
        routineId,
      });

      router.push(`/session/${sessionId}`);
    } catch {
      setActionErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      setStartingRoutineId((prev) => (prev === routineId ? null : prev));
    }
  };

  return {
    isStartingQuickSession,
    startingRoutineId,
    actionErrorMessage,
    startQuickSession,
    startRoutineSession,
    clearActionError,
  };
}
