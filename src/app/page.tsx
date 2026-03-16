"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock3,
  CloudOff,
  Dumbbell,
  FolderKanban,
  History,
  Play,
  Sparkles,
} from "lucide-react";

import {
  PageShell,
  SectionHeading,
  StatPill,
} from "@/components/brand/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRoutines } from "@/entities/routine/repo/routine.repo";
import {
  createSession,
  listSessions,
} from "@/entities/session/repo/session.repo";
import type { RoutineRecord, SessionRecord } from "@/lib/db";
import { setPendingSessionId } from "@/lib/pending-session";

const SESSION_SHELL_PREFETCH_PATH =
  "/session/11111111-1111-1111-1111-111111111111";

type HomeRoutineSummary = RoutineRecord & {
  sessionCount: number;
};

type RecentActivityPoint = {
  key: string;
  label: string;
  sessionCount: number;
};

type RoutineUsagePoint = {
  id: string;
  label: string;
  sessionCount: number;
  share: number;
};

type TrainingSnapshot = {
  totalSessions: number;
  totalRoutines: number;
  totalSets: number;
  totalVolume: number;
  sessionsLast7Days: number;
  activeDaysLast7: number;
  recentActivity: RecentActivityPoint[];
  routineUsage: RoutineUsagePoint[];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const QUICK_SESSION_ID = "__quick_session__";
const compactNumberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const weekdayFormatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "short",
});

const formatDateTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const getSessionVolume = (session: SessionRecord) =>
  session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

const EMPTY_TRAINING_SNAPSHOT: TrainingSnapshot = {
  totalSessions: 0,
  totalRoutines: 0,
  totalSets: 0,
  totalVolume: 0,
  sessionsLast7Days: 0,
  activeDaysLast7: 0,
  recentActivity: [],
  routineUsage: [],
};

const buildTrainingSnapshot = (
  sessions: SessionRecord[],
  routineNameById: Record<string, string>,
  totalRoutines: number,
): TrainingSnapshot => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: formatDateKey(date),
      label: weekdayFormatter.format(date),
      sessionCount: 0,
    };
  });

  const recentActivityByKey = new Map(
    recentActivity.map((item) => [item.key, item]),
  );
  const recentWindowStart = today.getTime() - 6 * DAY_IN_MS;

  const totalSets = sessions.reduce(
    (sum, session) => sum + session.sets.length,
    0,
  );
  const totalVolume = sessions.reduce(
    (sum, session) => sum + getSessionVolume(session),
    0,
  );

  const routineCountById = sessions.reduce<Record<string, number>>(
    (acc, session) => {
      const routineKey = session.routineId ?? QUICK_SESSION_ID;
      acc[routineKey] = (acc[routineKey] ?? 0) + 1;

      if (session.updatedAt >= recentWindowStart) {
        const sessionDate = new Date(session.updatedAt);
        sessionDate.setHours(0, 0, 0, 0);

        const entry = recentActivityByKey.get(formatDateKey(sessionDate));
        if (entry) {
          entry.sessionCount += 1;
        }
      }

      return acc;
    },
    {},
  );

  const routineUsage = Object.entries(routineCountById)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([id, sessionCount]) => ({
      id,
      label:
        id === QUICK_SESSION_ID
          ? "빠른 세션"
          : (routineNameById[id] ?? "삭제된 루틴"),
      sessionCount,
      share:
        sessions.length === 0
          ? 0
          : Math.round((sessionCount / sessions.length) * 100),
    }));

  const sessionsLast7Days = recentActivity.reduce(
    (sum, item) => sum + item.sessionCount,
    0,
  );
  const activeDaysLast7 = recentActivity.filter(
    (item) => item.sessionCount > 0,
  ).length;

  return {
    totalSessions: sessions.length,
    totalRoutines,
    totalSets,
    totalVolume,
    sessionsLast7Days,
    activeDaysLast7,
    recentActivity,
    routineUsage,
  };
};

export default function Home() {
  const router = useRouter();
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentRoutines, setRecentRoutines] = useState<HomeRoutineSummary[]>(
    [],
  );
  const [latestSession, setLatestSession] = useState<SessionRecord | null>(
    null,
  );
  const [routineNameById, setRoutineNameById] = useState<
    Record<string, string>
  >({});
  const [trainingSnapshot, setTrainingSnapshot] = useState<TrainingSnapshot>(
    EMPTY_TRAINING_SNAPSHOT,
  );
  const [isHydratingOverview, setIsHydratingOverview] = useState(true);

  useEffect(() => {
    router.prefetch("/routines");
    router.prefetch("/session/new");
    router.prefetch(SESSION_SHELL_PREFETCH_PATH);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setIsHydratingOverview(true);

      try {
        const [loadedRoutines, loadedSessions] = await Promise.all([
          listRoutines(),
          listSessions(),
        ]);

        if (cancelled) return;

        const sessionCountByRoutine = loadedSessions.reduce<
          Record<string, number>
        >((acc, session) => {
          if (session.routineId) {
            acc[session.routineId] = (acc[session.routineId] ?? 0) + 1;
          }
          return acc;
        }, {});

        const nextRoutineNameById = Object.fromEntries(
          loadedRoutines.map((routine) => [routine.id, routine.name]),
        );

        setRecentRoutines(
          loadedRoutines.slice(0, 3).map((routine) => ({
            ...routine,
            sessionCount: sessionCountByRoutine[routine.id] ?? 0,
          })),
        );
        setRoutineNameById(nextRoutineNameById);
        setTrainingSnapshot(
          buildTrainingSnapshot(
            loadedSessions,
            nextRoutineNameById,
            loadedRoutines.length,
          ),
        );
        setLatestSession(loadedSessions[0] ?? null);
      } catch {
        if (cancelled) return;
        setErrorMessage("최근 기록 정보를 불러오지 못했습니다.");
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

  const getRoutineLabelForSession = (session: SessionRecord): string => {
    if (!session.routineId) {
      return "빠른 세션";
    }

    return routineNameById[session.routineId] ?? "루틴 세션";
  };

  const handleStartSession = async (routineId: string | null = null) => {
    if (routineId ? startingRoutineId : isStartingSession) return;

    const sessionId = crypto.randomUUID();

    if (routineId) {
      setStartingRoutineId(routineId);
    } else {
      setIsStartingSession(true);
    }
    setErrorMessage(null);

    try {
      await createSession({
        id: sessionId,
        routineId,
      });

      if (!routineId) {
        setPendingSessionId(sessionId);
      }

      router.push(`/session/${sessionId}`);
    } catch {
      setErrorMessage("세션 생성에 실패했습니다. 다시 시도해 주세요.");
      if (routineId) {
        setStartingRoutineId((prev) => (prev === routineId ? null : prev));
      } else {
        setIsStartingSession(false);
      }
    }
  };

  return (
    <PageShell
      eyebrow="Offline Training Log"
      title="Workout PWA"
      description="포트폴리오용 간판 프로젝트로 보이려면 첫인상뿐 아니라 제품 완성도가 보여야 합니다. 그래서 홈에서 바로 시작, 최근 기록 이어가기, 루틴 기반 시작까지 한 화면에 정리했습니다."
      actions={
        <>
          <Button
            type="button"
            size="lg"
            disabled={isStartingSession}
            onClick={() => {
              void handleStartSession();
            }}
          >
            <Dumbbell className="h-4 w-4" />
            {isStartingSession ? "세션 시작 중..." : "세션 시작"}
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/routines">
              루틴 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/routines/new">루틴 추가</Link>
          </Button>
        </>
      }
      meta={
        <>
          <StatPill label="Primary" value="Quick start" icon={Dumbbell} />
          <StatPill label="Product" value="Recent resume" icon={History} />
          <StatPill label="Resilience" value="Offline save" icon={CloudOff} />
        </>
      }
    >
      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="bg-[linear-gradient(145deg,rgba(9,20,22,0.94),rgba(4,10,12,0.9))] text-white">
          <CardHeader>
            <p className="brand-kicker !text-primary/90">Resume Flow</p>
            <CardTitle className="text-3xl text-white">
              최근 기록을 바로 이어갈 수 있어야 제품처럼 보입니다.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-white/76 sm:text-base">
            {isHydratingOverview ? (
              <p>최근 세션 정보를 불러오는 중...</p>
            ) : latestSession ? (
              <div className="glass-field rounded-[1.4rem] px-5 py-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="brand-kicker !text-white/48">
                    Latest Session
                  </span>
                  <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/68">
                    {latestSession.sets.length} sets
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                    {getRoutineLabelForSession(latestSession)}
                  </p>
                  <p className="text-sm leading-6 text-white/68">
                    마지막 기록: {formatDateTime(latestSession.updatedAt)}
                  </p>
                </div>
                <div className="mt-5">
                  <Button asChild size="sm">
                    <Link href={`/session/${latestSession.id}`}>
                      최근 세션 이어가기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="glass-field rounded-[1.4rem] px-5 py-5">
                아직 저장된 세션이 없습니다. 첫 세션을 만들고 나면 이 영역이
                최근 기록 대시보드로 바뀝니다.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="hud-chip rounded-[1.2rem] px-4 py-4">
                <Clock3 className="mb-4 h-5 w-5 text-primary" />
                <p className="font-display text-lg tracking-[-0.04em] text-white">
                  resume first
                </p>
              </div>
              <div className="hud-chip rounded-[1.2rem] px-4 py-4">
                <FolderKanban className="mb-4 h-5 w-5 text-primary" />
                <p className="font-display text-lg tracking-[-0.04em] text-white">
                  routine entry
                </p>
              </div>
              <div className="hud-chip rounded-[1.2rem] px-4 py-4">
                <Sparkles className="mb-4 h-5 w-5 text-primary" />
                <p className="font-display text-lg tracking-[-0.04em] text-white">
                  portfolio polish
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="brand-kicker">Start Here</p>
            <CardTitle className="text-3xl">빠른 시작 경로</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="glass-field rounded-[1.2rem] px-4 py-4">
              <p className="mb-2 text-sm font-medium text-white">
                1. 빠른 기록
              </p>
              <p className="text-sm leading-7 text-white/58">
                루틴 없이 바로 운동을 기록합니다. 가장 짧은 데모 경로입니다.
              </p>
            </div>
            <div className="glass-field rounded-[1.2rem] px-4 py-4">
              <p className="mb-2 text-sm font-medium text-white">
                2. 루틴 기반 기록
              </p>
              <p className="text-sm leading-7 text-white/58">
                저장된 루틴을 고르고 바로 세션으로 진입합니다.
              </p>
            </div>
            <div className="glass-field rounded-[1.2rem] px-4 py-4">
              <p className="mb-2 text-sm font-medium text-white">
                3. 첫 루틴 생성
              </p>
              <p className="text-sm leading-7 text-white/58">
                포트폴리오 시연용 루틴을 하나 만들어 구조화된 흐름을 보여줍니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Training Snapshot"
          title="기록이 쌓이면 제품 깊이가 바로 보입니다."
          description="복잡한 차트 라이브러리 없이도 최근 활동량과 루틴 사용 비중이 읽히도록 홈에서 바로 보여줍니다."
        />

        {isHydratingOverview ? (
          <Card>
            <CardContent className="pt-6 text-sm text-white/58">
              운동 데이터를 집계하는 중...
            </CardContent>
          </Card>
        ) : trainingSnapshot.totalSessions === 0 ? (
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm text-white/58">
              <p>아직 집계할 운동 기록이 없습니다.</p>
              <p>
                첫 세션을 저장하면 `총 세션`, `최근 7일 활동`, `루틴 사용
                비중`이 이 영역에 쌓입니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <Card>
              <CardHeader>
                <p className="brand-kicker">Session Metrics</p>
                <CardTitle className="text-3xl">
                  한눈에 보는 기록 요약
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="glass-field rounded-[1.2rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                      총 세션
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                      {trainingSnapshot.totalSessions}
                    </p>
                    <p className="mt-2 text-sm text-white/52">
                      저장된 전체 운동 기록 수
                    </p>
                  </div>
                  <div className="glass-field rounded-[1.2rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                      등록 루틴
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                      {trainingSnapshot.totalRoutines}
                    </p>
                    <p className="mt-2 text-sm text-white/52">
                      홈에서 바로 시작 가능한 루틴 수
                    </p>
                  </div>
                  <div className="glass-field rounded-[1.2rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                      저장된 세트
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                      {trainingSnapshot.totalSets}
                    </p>
                    <p className="mt-2 text-sm text-white/52">
                      입력과 저장이 완료된 총 세트 수
                    </p>
                  </div>
                  <div className="glass-field rounded-[1.2rem] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                      누적 볼륨
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                      {formatCompactNumber(trainingSnapshot.totalVolume)}
                    </p>
                    <p className="mt-2 text-sm text-white/52">
                      weight x reps 기준 합계
                    </p>
                  </div>
                </div>

                <div className="surface-soft flex items-start gap-3 rounded-[1.2rem] px-4 py-4 text-sm text-white/60">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="leading-6">
                    최근 7일 동안 {trainingSnapshot.sessionsLast7Days}회
                    기록했고, {trainingSnapshot.activeDaysLast7}일 실제로
                    운동했습니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <p className="brand-kicker">Recent Activity</p>
                <CardTitle className="text-3xl">최근 7일 활동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {trainingSnapshot.recentActivity.map((item) => {
                    const maxSessionCount = Math.max(
                      1,
                      ...trainingSnapshot.recentActivity.map(
                        (entry) => entry.sessionCount,
                      ),
                    );
                    const height =
                      24 +
                      Math.round((item.sessionCount / maxSessionCount) * 72);

                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.035] px-2 py-3"
                      >
                        <div className="flex h-28 items-end">
                          <div
                            className="w-6 rounded-full bg-[linear-gradient(180deg,rgba(111,255,220,0.95),rgba(111,255,220,0.18))] shadow-[0_0_28px_rgba(111,255,220,0.18)]"
                            style={{
                              height: `${item.sessionCount === 0 ? 12 : height}px`,
                            }}
                          />
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                            {item.label}
                          </p>
                          <p className="font-display text-lg tracking-[-0.04em] text-white">
                            {item.sessionCount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm leading-6 text-white/56">
                  막대 높이는 일자별 세션 수를 의미합니다. 빈 날도 함께 보여줘서
                  실제 사용 리듬이 읽히도록 구성했습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <p className="brand-kicker">Routine Mix</p>
                <CardTitle className="text-3xl">루틴 사용 비중</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {trainingSnapshot.routineUsage.map((routine) => (
                  <div
                    key={routine.id}
                    className="glass-field rounded-[1.2rem] px-4 py-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {routine.label}
                        </p>
                        <p className="text-sm text-white/52">
                          {routine.sessionCount}회 기록
                        </p>
                      </div>
                      <div className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/68">
                        {routine.share}%
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(111,255,220,0.95),rgba(106,129,255,0.65))]"
                        style={{ width: `${Math.max(routine.share, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="surface-soft flex items-start gap-3 rounded-[1.2rem] px-4 py-4 text-sm text-white/60">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="leading-6">
                    상위 루틴만 노출해 첫 화면에서 바로 운동 패턴을 읽을 수 있게
                    했습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Recent Routines"
          title="바로 시작할 루틴"
          description="상세 화면을 보기 전에 먼저 시작할 수 있게 두었습니다. 제품 신뢰는 클릭 수를 줄이는 데서도 드러납니다."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/routines">전체 보기</Link>
            </Button>
          }
        />

        {isHydratingOverview ? (
          <Card>
            <CardContent className="pt-6 text-sm text-white/58">
              최근 루틴을 불러오는 중...
            </CardContent>
          </Card>
        ) : recentRoutines.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-white/58">
              아직 루틴이 없습니다. `루틴 추가`로 첫 흐름을 만들어 주세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {recentRoutines.map((routine) => (
              <Card key={routine.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className="brand-kicker">Routine</span>
                      <CardTitle className="text-3xl">{routine.name}</CardTitle>
                    </div>
                    <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/66">
                      {routine.sessionCount} sessions
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="min-h-16 text-sm leading-7 text-white/56">
                    {routine.description ??
                      "설명이 없습니다. 어떤 루틴인지 한 줄만 있어도 신뢰도가 올라갑니다."}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={startingRoutineId === routine.id}
                      onClick={() => {
                        void handleStartSession(routine.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      {startingRoutineId === routine.id
                        ? "세션 시작 중..."
                        : `${routine.name} 시작`}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/routines/${routine.id}`}>상세 보기</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
