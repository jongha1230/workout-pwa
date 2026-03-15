"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Hash,
  Plus,
  Repeat2,
  Save,
  ShieldCheck,
  Trash2,
  Weight,
} from "lucide-react";

import {
  EmptyStatePanel,
  PageShell,
  StatPill,
} from "@/components/brand/page-shell";
import { SetInputSchema } from "@/entities/model/session/model/set.schema";
import { getRoutine } from "@/entities/routine/repo/routine.repo";
import {
  createSession,
  getSession,
} from "@/entities/session/repo/session.repo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { consumePendingSessionId } from "@/lib/pending-session";
import { flushSyncEngine } from "@/lib/sync/sync-engine";
import { cn } from "@/lib/utils";
import { useSessionStore, type SessionSet } from "@/store/session.store";

type DraftSet = {
  weight: string;
  reps: string;
};

const SESSION_RULES = [
  {
    label: "Rule 01",
    description:
      "새 세트는 직전 세트 값을 자동으로 이어받아 반복 입력을 줄입니다.",
  },
  {
    label: "Rule 02",
    description:
      "완료 표시 전에도 입력 검증을 수행해 잘못된 상태 저장을 막습니다.",
  },
  {
    label: "Rule 03",
    description:
      "IndexedDB 기반 local-first 저장으로 네트워크와 분리된 기록 흐름을 유지합니다.",
  },
] as const;

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionStateShellProps = {
  title: string;
  description: string;
  sessionId?: string;
  children?: ReactNode;
};

function SessionStateShell({
  title,
  description,
  sessionId,
  children,
}: SessionStateShellProps) {
  return (
    <PageShell
      density="compact"
      eyebrow="Session"
      title={title}
      description={description}
      actions={
        <>
          <Button asChild size="lg" variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/routines">루틴으로</Link>
          </Button>
        </>
      }
      meta={
        <>
          <StatPill
            label="Session ID"
            value={sessionId ? sessionId.slice(0, 8) : "N/A"}
            icon={Hash}
          />
          <StatPill label="Storage" value="Local-first" icon={ShieldCheck} />
          <StatPill label="Mode" value="Read-only state" icon={Save} />
        </>
      }
    >
      {children}
    </PageShell>
  );
}

type CompactSessionSummaryProps = {
  totalSets: number;
  completedCount: number;
  completionRate: string;
};

function CompactSessionSummary({
  totalSets,
  completedCount,
  completionRate,
}: CompactSessionSummaryProps) {
  return (
    <Card className="sm:hidden bg-[linear-gradient(180deg,rgba(9,19,21,0.9),rgba(6,12,15,0.8))]">
      <CardContent className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-field rounded-[1rem] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">
              Sets
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
              {totalSets}
            </p>
          </div>
          <div className="glass-field rounded-[1rem] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">
              Done
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
              {completedCount}
            </p>
          </div>
          <div className="glass-field rounded-[1rem] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">
              Rate
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
              {completionRate}
            </p>
          </div>
        </div>

        <details className="group rounded-[1rem] border border-white/10 bg-white/4 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white">
            입력 규칙 보기
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/42 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-3 grid gap-2">
            {SESSION_RULES.map((rule) => (
              <div
                key={rule.label}
                className="hud-chip rounded-[0.95rem] px-3 py-3 text-sm leading-6 text-white/64"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/90">
                  {rule.label}
                </p>
                <p className="mt-1">{rule.description}</p>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export default function SessionDetailPage() {
  const { id: paramSessionId } = useParams<{ id?: string }>();
  const pathname = usePathname();
  const sessionIdFromPathname = pathname.match(/^\/session\/([^/?#]+)/)?.[1];
  const sessionId = sessionIdFromPathname ?? paramSessionId ?? "";

  const setsFromStore = useSessionStore((state) => state.sessions[sessionId]);
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const addSet = useSessionStore((state) => state.addSet);
  const updateSet = useSessionStore((state) => state.updateSet);
  const removeSet = useSessionStore((state) => state.removeSet);
  const replaceSets = useSessionStore((state) => state.replaceSets);

  const [draftBySetId, setDraftBySetId] = useState<Record<string, DraftSet>>(
    {},
  );
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("세션");
  const [sessionDescription, setSessionDescription] = useState(
    "세트를 여러 개 추가/수정/삭제할 수 있습니다.",
  );
  const [routineLinkHref, setRoutineLinkHref] = useState("/routines");
  const [isHydrating, setIsHydrating] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeSets = setsFromStore ?? [];
  const completedCount = safeSets.filter(
    (item) => item.completed ?? false,
  ).length;
  const completionRate =
    safeSets.length === 0
      ? "0%"
      : `${Math.round((completedCount / safeSets.length) * 100)}%`;

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const loadSession = async () => {
      setIsHydrating(true);
      setLoadErrorMessage(null);
      setErrorMessage(null);
      setSessionTitle("세션");
      setSessionDescription("세트를 여러 개 추가/수정/삭제할 수 있습니다.");
      setRoutineLinkHref("/routines");

      if (!SESSION_ID_PATTERN.test(sessionId)) {
        if (!cancelled) {
          setLoadErrorMessage("유효하지 않은 세션 ID입니다.");
          setIsHydrating(false);
        }
        return;
      }

      try {
        const currentSession = await getSession(sessionId);
        if (!currentSession) {
          const shouldBootstrapSession = consumePendingSessionId(sessionId);

          if (shouldBootstrapSession) {
            await createSession({
              id: sessionId,
              routineId: null,
            });
            await hydrateSession(sessionId);
            if (!cancelled) {
              setSessionTitle("빠른 세션");
              setSessionDescription("루틴 없이 바로 기록하는 세션입니다.");
              setRoutineLinkHref("/routines");
            }
            return;
          }

          if (!cancelled) {
            setLoadErrorMessage("세션을 찾을 수 없습니다.");
          }
          return;
        }

        await hydrateSession(sessionId);

        if (!currentSession.routineId) {
          if (!cancelled) {
            setSessionTitle("빠른 세션");
            setSessionDescription("루틴 없이 바로 기록하는 세션입니다.");
            setRoutineLinkHref("/routines");
          }
          return;
        }

        const routine = await getRoutine(currentSession.routineId);
        if (!cancelled) {
          setSessionTitle(routine?.name ?? "루틴 세션");
          setSessionDescription(
            routine?.description ??
              "세트를 여러 개 추가/수정/삭제할 수 있습니다.",
          );
          setRoutineLinkHref(`/routines/${currentSession.routineId}`);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadErrorMessage("세션 데이터를 불러오지 못했습니다.");
        }
        console.error("Failed to load session data.", error);
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [hydrateSession, sessionId]);

  const handleAddSet = () => {
    if (!sessionId) return;

    const lastSet = safeSets.at(-1);
    const lastDraft = lastSet ? draftBySetId[lastSet.id] : undefined;

    const initialWeightText =
      lastDraft?.weight?.trim() && lastDraft.weight.trim().length > 0
        ? lastDraft.weight
        : lastSet
          ? String(lastSet.weight)
          : "";
    const initialRepsText =
      lastDraft?.reps?.trim() && lastDraft.reps.trim().length > 0
        ? lastDraft.reps
        : lastSet
          ? String(lastSet.reps)
          : "";

    const hasPreviousSet = Boolean(lastSet);
    const initialWeight = Number(initialWeightText);
    const initialReps = Number(initialRepsText);
    const seed = hasPreviousSet
      ? {
          weight:
            Number.isFinite(initialWeight) && initialWeight >= 0
              ? initialWeight
              : (lastSet?.weight ?? 0),
          reps:
            Number.isInteger(initialReps) && initialReps >= 1
              ? initialReps
              : (lastSet?.reps ?? 1),
        }
      : undefined;
    const newId = addSet(sessionId, seed, { persist: false });

    setDraftBySetId((prev) => ({
      ...prev,
      [newId]: {
        weight: initialWeightText,
        reps: initialRepsText,
      },
    }));
    setActiveSetId(newId);
  };

  const handleChange = (
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    setDraftBySetId((prev) => {
      const baseSet = safeSets.find((item) => item.id === setId);
      const current = prev[setId] ?? {
        weight: baseSet ? String(baseSet.weight) : "",
        reps: baseSet ? String(baseSet.reps) : "",
      };
      return {
        ...prev,
        [setId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleRemoveSet = (setId: string) => {
    if (!sessionId) return;

    removeSet(sessionId, setId, { persist: false });

    setDraftBySetId((prev) => {
      const next = { ...prev };
      delete next[setId];
      return next;
    });
    setActiveSetId((prev) => (prev === setId ? null : prev));
  };

  const handleToggleCompleted = (item: SessionSet, checked: boolean) => {
    if (!sessionId) return;

    const draft = draftBySetId[item.id];
    const weightValue = draft?.weight ?? String(item.weight);
    const repsValue = draft?.reps ?? String(item.reps);

    if (weightValue.trim() === "" || repsValue.trim() === "") {
      const message = "완료 체크 전에 중량과 횟수를 입력해 주세요.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const parsed = SetInputSchema.safeParse({
      weight: weightValue,
      reps: repsValue,
    });

    if (!parsed.success) {
      const message = `완료 체크 실패: ${parsed.error.issues[0]?.message ?? "입력값 오류"}`;
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    updateSet(sessionId, item.id, {
      weight: parsed.data.weight,
      reps: parsed.data.reps,
      completed: checked,
    });

    setDraftBySetId((prev) => ({
      ...prev,
      [item.id]: {
        weight: String(parsed.data.weight),
        reps: String(parsed.data.reps),
      },
    }));
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) return;

    const currentSets = useSessionStore.getState().sessions[sessionId] ?? [];
    const nextSets: SessionSet[] = [];

    for (let index = 0; index < currentSets.length; index += 1) {
      const item = currentSets[index];
      const draft = draftBySetId[item.id];
      const weightValue = draft?.weight ?? String(item.weight);
      const repsValue = draft?.reps ?? String(item.reps);

      if (draft && (weightValue.trim() === "" || repsValue.trim() === "")) {
        const message = `세트 ${index + 1}: 중량과 횟수를 입력해 주세요.`;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const parsed = SetInputSchema.safeParse({
        weight: weightValue,
        reps: repsValue,
      });

      if (!parsed.success) {
        const message = `세트 ${index + 1}: ${parsed.error.issues[0]?.message ?? "입력값 오류"}`;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      nextSets.push({
        id: item.id,
        weight: parsed.data.weight,
        reps: parsed.data.reps,
        completed: item.completed ?? false,
      });
    }

    try {
      await replaceSets(sessionId, nextSets);
      await flushSyncEngine();
      setErrorMessage(null);
      toast.success("Saved session successfully");
    } catch (error) {
      console.error("Failed to save session.", error);
      const message = "세션 저장에 실패했습니다. 다시 시도해 주세요.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  if (!sessionId) {
    return (
      <>
        <Toaster position="top-right" />
        <SessionStateShell
          title="세션 ID가 없습니다"
          description="세션을 시작한 뒤 다시 접근해 주세요."
        />
      </>
    );
  }

  if (isHydrating) {
    return (
      <>
        <Toaster position="top-right" />
        <SessionStateShell
          title="세션 불러오는 중..."
          description="로컬에 저장된 세트와 루틴 정보를 연결하고 있습니다."
          sessionId={sessionId}
        />
      </>
    );
  }

  if (loadErrorMessage) {
    return (
      <>
        <Toaster position="top-right" />
        <SessionStateShell
          title="세션을 불러올 수 없습니다"
          description={loadErrorMessage}
          sessionId={sessionId}
        />
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "!rounded-[1rem] !border !border-white/12 !bg-[#0b1417]/92 !text-sm !text-white !shadow-[0_24px_55px_rgba(0,0,0,0.36)]",
        }}
      />
      <PageShell
        density="compact"
        eyebrow="Active Session"
        title={sessionTitle}
        description={sessionDescription}
        meta={
          <>
            <StatPill
              label="Sets"
              value={`${safeSets.length} ready`}
              icon={Hash}
              className="hidden sm:flex"
            />
            <StatPill
              label="Completion"
              value={`${completedCount}/${safeSets.length} · ${completionRate}`}
              icon={CheckCircle2}
              className="hidden sm:flex"
            />
            <StatPill
              label="Source"
              value="Local-first"
              icon={ShieldCheck}
              className="hidden sm:flex"
            />
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <Card className="z-10 border-primary/10 bg-[linear-gradient(180deg,rgba(10,19,22,0.92),rgba(6,12,15,0.86))] sm:sticky sm:top-4">
                <CardContent className="flex flex-col gap-4 px-4 pt-4 sm:px-6 sm:pt-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <p className="brand-kicker !text-primary/90">Command Bar</p>
                    <div className="space-y-1">
                      <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                        세트 편집
                      </p>
                      <p className="text-sm leading-6 text-white/54">
                        <span className="sm:hidden">
                          세트 추가와 저장을 먼저 두고, 보조 설명은 접었습니다.
                        </span>
                        <span className="hidden sm:inline">
                          직전 값 자동 채움과 저장 시점 검증을 유지하면서,
                          액션은 상단에서 바로 실행합니다.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full justify-center sm:w-auto"
                      onClick={handleAddSet}
                    >
                      <Plus className="h-4 w-4" />
                      세트 추가
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full justify-center sm:w-auto"
                    >
                      <Save className="h-4 w-4" />
                      저장
                    </Button>
                    <Button
                      asChild
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full justify-center sm:w-auto"
                    >
                      <Link href={routineLinkHref}>루틴으로</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CompactSessionSummary
                totalSets={safeSets.length}
                completedCount={completedCount}
                completionRate={completionRate}
              />

              {errorMessage ? (
                <p className="rounded-[1rem] border border-destructive/30 bg-destructive/12 px-4 py-3 text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              {safeSets.length === 0 ? (
                <EmptyStatePanel
                  title="세트를 추가해 주세요."
                  description="지금은 아무 세트도 없습니다. `세트 추가`를 눌러 첫 입력을 만든 뒤 저장하면, 이후 세트는 직전 값이 자동으로 이어집니다."
                  action={
                    <Button type="button" onClick={handleAddSet}>
                      첫 세트 만들기
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4">
                  {safeSets.map((item, index) => {
                    const draft = draftBySetId[item.id];
                    const currentWeight = draft?.weight ?? String(item.weight);
                    const currentReps = draft?.reps ?? String(item.reps);
                    const isCompleted = item.completed ?? false;
                    const isActive = activeSetId === item.id;

                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          "overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(10,18,21,0.88),rgba(7,13,16,0.74))] transition-all",
                          isActive &&
                            "border-primary/28 shadow-[0_0_0_1px_rgba(111,255,220,0.08),0_28px_70px_rgba(0,0,0,0.36)]",
                          isCompleted &&
                            "border-primary/22 bg-[linear-gradient(180deg,rgba(10,26,26,0.9),rgba(7,15,16,0.74))]",
                        )}
                      >
                        <CardContent className="space-y-5 px-4 pt-5 sm:space-y-6 sm:px-6 sm:pt-6">
                          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-4">
                              <div
                                className={cn(
                                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border text-xl font-display font-semibold tracking-[-0.05em] sm:h-14 sm:w-14 sm:text-2xl",
                                  isCompleted
                                    ? "border-primary/24 bg-primary/12 text-primary"
                                    : "border-white/12 bg-white/6 text-white",
                                )}
                              >
                                {index + 1}
                              </div>
                              <div className="space-y-2">
                                <p className="brand-kicker !text-white/44">
                                  Set Block
                                </p>
                                <div className="space-y-1 sm:space-y-1.5">
                                  <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
                                    {isCompleted
                                      ? "Completed"
                                      : isActive
                                        ? "Editing"
                                        : "Ready"}
                                  </p>
                                  <p className="text-xs leading-5 text-white/44 sm:hidden">
                                    중량과 횟수를 입력한 뒤 완료 상태를 바꿀 수
                                    있습니다.
                                  </p>
                                  <p className="hidden text-sm leading-6 text-white/52 sm:block">
                                    세트 {index + 1} · 중량과 횟수를 입력하고
                                    완료 상태를 전환할 수 있습니다.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                              <span
                                className={cn(
                                  "hud-chip hidden rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] sm:inline-flex",
                                  isCompleted
                                    ? "border-primary/20 text-primary"
                                    : "text-white/54",
                                )}
                              >
                                {isCompleted ? "Completed" : "In Progress"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant={isCompleted ? "secondary" : "outline"}
                                className="w-full justify-center sm:w-auto"
                                onClick={() => {
                                  void handleToggleCompleted(
                                    item,
                                    !isCompleted,
                                  );
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {isCompleted ? "완료 해제" : "완료 표시"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="w-full justify-center sm:w-auto"
                                onClick={() => handleRemoveSet(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                삭제
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="glass-field rounded-[1.25rem] p-3.5 sm:p-4">
                              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-white/48">
                                <Weight className="h-4 w-4" />
                                중량
                              </span>
                              <div className="relative mt-4">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="중량 (예: 60)"
                                  className="h-12 rounded-[0.95rem] border-0 bg-transparent px-0 pr-12 text-xl font-display font-semibold tracking-[-0.05em] shadow-none focus-visible:ring-0 sm:h-14 sm:text-2xl"
                                  value={currentWeight}
                                  autoFocus={isActive}
                                  onFocus={() => setActiveSetId(item.id)}
                                  onChange={(event) =>
                                    handleChange(
                                      item.id,
                                      "weight",
                                      event.target.value,
                                    )
                                  }
                                />
                                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium uppercase tracking-[0.22em] text-white/36">
                                  KG
                                </span>
                              </div>
                            </label>

                            <label className="glass-field rounded-[1.25rem] p-3.5 sm:p-4">
                              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-white/48">
                                <Repeat2 className="h-4 w-4" />
                                횟수
                              </span>
                              <div className="relative mt-4">
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  placeholder="횟수 (예: 10)"
                                  className="h-12 rounded-[0.95rem] border-0 bg-transparent px-0 pr-12 text-xl font-display font-semibold tracking-[-0.05em] shadow-none focus-visible:ring-0 sm:h-14 sm:text-2xl"
                                  value={currentReps}
                                  onFocus={() => setActiveSetId(item.id)}
                                  onChange={(event) =>
                                    handleChange(
                                      item.id,
                                      "reps",
                                      event.target.value,
                                    )
                                  }
                                />
                                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium uppercase tracking-[0.22em] text-white/36">
                                  REPS
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                              <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/52">
                                {index === 0
                                  ? "Empty Start"
                                  : "Seed From Previous"}
                              </span>
                              {isActive ? (
                                <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                                  Active Input
                                </span>
                              ) : null}
                            </div>
                            <p className="hidden text-xs font-medium uppercase tracking-[0.22em] text-white/34 sm:block">
                              {index === 0
                                ? "첫 세트는 비어 있는 상태에서 시작합니다."
                                : "직전 세트 값을 자동으로 이어받습니다."}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="hidden space-y-4 sm:block">
              <Card className="bg-[linear-gradient(180deg,rgba(9,19,21,0.9),rgba(6,12,15,0.8))]">
                <CardContent className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <p className="brand-kicker !text-primary/90">
                      Session Pulse
                    </p>
                    <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                      현재 세션 상태
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="glass-field rounded-[1.15rem] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/42">
                        Total sets
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                        {safeSets.length}
                      </p>
                    </div>
                    <div className="glass-field rounded-[1.15rem] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/42">
                        Completion
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                        {completedCount}/{safeSets.length}
                      </p>
                      <p className="mt-2 text-sm text-white/46">
                        {completionRate} 완료
                      </p>
                    </div>
                    <div className="glass-field rounded-[1.15rem] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/42">
                        Save model
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/54">
                        입력은 draft로 유지하고, 저장 시점에만 Zod 검증 후
                        확정합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[linear-gradient(180deg,rgba(9,16,18,0.84),rgba(6,12,15,0.72))]">
                <CardContent className="space-y-4 pt-6">
                  <p className="brand-kicker !text-white/50">Input Rules</p>
                  <div className="grid gap-3">
                    {SESSION_RULES.map((rule) => (
                      <div
                        key={rule.label}
                        className="hud-chip rounded-[1rem] px-4 py-4"
                      >
                        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/90">
                          {rule.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/58">
                          {rule.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </form>
      </PageShell>
    </>
  );
}
