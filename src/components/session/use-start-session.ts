"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSession } from "@/entities/session/repo/session.repo";
import { setPendingSessionId } from "@/lib/pending-session";

export type StartSessionActions = {
  isStartingQuickSession: boolean;
  startingRoutineId: string | null;
  actionErrorMessage: string | null;
  startQuickSession: () => Promise<void>;
  startRoutineSession: (routineId: string) => Promise<void>;
  clearActionError: () => void;
};

type UseStartSessionOptions = {
  markPendingQuickSession?: boolean;
};

const DEFAULT_START_SESSION_ERROR =
  "세션 생성에 실패했습니다. 다시 시도해 주세요.";
const SESSION_NAVIGATION_FALLBACK_DELAY_MS = 400;

export function useStartSession(
  options: UseStartSessionOptions = {},
): StartSessionActions {
  const { markPendingQuickSession = true } = options;
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

  const navigateToSession = (sessionId: string) => {
    const href = `/session/${sessionId}`;

    router.prefetch(href);
    router.push(href);

    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      if (window.location.pathname === href) return;
      window.location.assign(href);
    }, SESSION_NAVIGATION_FALLBACK_DELAY_MS);
  };

  const startSession = async (routineId: string | null) => {
    if (routineId) {
      if (startingRoutineId) return;
      setStartingRoutineId(routineId);
    } else {
      if (isStartingQuickSession) return;
      setIsStartingQuickSession(true);
    }

    const sessionId = crypto.randomUUID();
    clearActionError();
    router.prefetch(`/session/${sessionId}`);

    try {
      await createSession({
        id: sessionId,
        routineId,
      });

      if (!routineId && markPendingQuickSession) {
        setPendingSessionId(sessionId);
      }

      navigateToSession(sessionId);
    } catch {
      setActionErrorMessage(DEFAULT_START_SESSION_ERROR);

      if (routineId) {
        setStartingRoutineId((prev) => (prev === routineId ? null : prev));
        return;
      }

      setIsStartingQuickSession(false);
    }
  };

  const startQuickSession = async () => {
    await startSession(null);
  };

  const startRoutineSession = async (routineId: string) => {
    await startSession(routineId);
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
