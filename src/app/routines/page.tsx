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
  deleteRoutine,
  listRoutines,
} from "@/entities/routine/repo/routine.repo";
import type { RoutineRecord } from "@/lib/db";

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(
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

  const handleOpenRoutine = (routineId: string) => {
    router.push(`/routines/${encodeURIComponent(routineId)}`);
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">루틴</h1>
        <Button asChild size="sm">
          <Link href="/routines/new">루틴 추가</Link>
        </Button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            루틴 불러오는 중...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && routines.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            아직 루틴이 없습니다. 루틴을 추가해 주세요.
          </CardContent>
        </Card>
      ) : null}

      {routines.map((routine) => (
        <Card
          key={routine.id}
          role="button"
          tabIndex={0}
          className="cursor-pointer transition-colors hover:bg-muted/30"
          onClick={() => handleOpenRoutine(routine.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpenRoutine(routine.id);
            }
          }}
        >
          <CardHeader>
            <CardTitle>{routine.name}</CardTitle>
            <CardDescription>
              {routine.description ?? "설명이 없습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deletingRoutineId === routine.id}
              onClick={(event) => {
                event.stopPropagation();
                void handleDeleteRoutine(routine.id);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            >
              {deletingRoutineId === routine.id ? "삭제 중..." : "루틴 삭제"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
