"use client";

import { useEffect, useMemo, useState } from "react";

import type { HomeOverviewData } from "@/components/home/home.types";
import { buildTrainingSnapshot } from "@/components/home/home.utils";
import { listRoutines } from "@/entities/routine/repo/routine.repo";
import { listSessions } from "@/entities/session/repo/session.repo";
import type { RoutineRecord, SessionRecord } from "@/lib/db";

export function useHomeOverview(): HomeOverviewData {
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isHydratingOverview, setIsHydratingOverview] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setIsHydratingOverview(true);
      setLoadErrorMessage(null);

      try {
        const [loadedRoutines, loadedSessions] = await Promise.all([
          listRoutines(),
          listSessions(),
        ]);

        if (cancelled) return;

        setRoutines(loadedRoutines);
        setSessions(loadedSessions);
      } catch {
        if (cancelled) return;
        setLoadErrorMessage("최근 기록 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setIsHydratingOverview(false);
        }
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const routineNameById = useMemo(
    () =>
      Object.fromEntries(routines.map((routine) => [routine.id, routine.name])),
    [routines],
  );

  const latestSession = useMemo(() => sessions[0] ?? null, [sessions]);

  const sessionCountByRoutine = useMemo(
    () =>
      sessions.reduce<Record<string, number>>((acc, session) => {
        if (session.routineId) {
          acc[session.routineId] = (acc[session.routineId] ?? 0) + 1;
        }
        return acc;
      }, {}),
    [sessions],
  );

  const featuredRoutines = useMemo(
    () =>
      routines.slice(0, 3).map((routine) => ({
        ...routine,
        sessionCount: sessionCountByRoutine[routine.id] ?? 0,
      })),
    [routines, sessionCountByRoutine],
  );

  const trainingSnapshot = useMemo(
    () => buildTrainingSnapshot(sessions, routineNameById, routines.length),
    [sessions, routineNameById, routines.length],
  );

  return {
    isHydratingOverview,
    loadErrorMessage,
    latestSession,
    routineNameById,
    featuredRoutines,
    trainingSnapshot,
  };
}
