"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock3,
  CloudOff,
  Dumbbell,
  Flame,
  FolderKanban,
  History,
  Play,
  Sparkles,
  Target,
} from "lucide-react";

import {
  PageShell,
  SectionHeading,
  StatPill,
} from "@/components/brand/page-shell";
import type {
  HomeOverviewData,
  HomeRoutineSummary,
  HomeStartSessionActions,
  TrainingSnapshot,
} from "@/components/home/home.types";
import {
  RoutineShareChart,
  TrainingActivityChart,
} from "@/components/home/training-insights-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionRecord } from "@/lib/db";

const compactNumberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatDateTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

const getRoutineLabelForSession = (
  session: SessionRecord,
  routineNameById: Record<string, string>,
) => {
  if (!session.routineId) {
    return "빠른 세션";
  }

  return routineNameById[session.routineId] ?? "루틴 세션";
};

type HomeViewProps = {
  overview: HomeOverviewData;
  sessionStart: HomeStartSessionActions;
};

type RecentSessionSectionProps = {
  isHydratingOverview: boolean;
  latestSession: SessionRecord | null;
  routineNameById: Record<string, string>;
};

type TrainingSnapshotSectionProps = {
  isHydratingOverview: boolean;
  trainingSnapshot: TrainingSnapshot;
};

type FeaturedRoutineSectionProps = {
  isHydratingOverview: boolean;
  featuredRoutines: HomeRoutineSummary[];
  startingRoutineId: string | null;
  onStartRoutineSession: (routineId: string) => Promise<void>;
};

function RecentSessionSection({
  isHydratingOverview,
  latestSession,
  routineNameById,
}: RecentSessionSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <Card className="bg-[linear-gradient(145deg,rgba(9,20,22,0.94),rgba(4,10,12,0.9))] text-white">
        <CardHeader>
          <p className="brand-kicker !text-primary/90">최근 이어가기</p>
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
                <span className="brand-kicker !text-white/48">최근 세션</span>
                <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/68">
                  {latestSession.sets.length}세트
                </span>
              </div>
              <div className="space-y-2">
                <p className="font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                  {getRoutineLabelForSession(latestSession, routineNameById)}
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
              아직 저장된 세션이 없습니다. 첫 세션을 만들고 나면 이 영역이 최근
              기록 대시보드로 바뀝니다.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="hud-chip rounded-[1.2rem] px-4 py-4">
              <Clock3 className="mb-4 h-5 w-5 text-primary" />
              <p className="font-display text-lg tracking-[-0.04em] text-white">
                최근 복귀
              </p>
            </div>
            <div className="hud-chip rounded-[1.2rem] px-4 py-4">
              <FolderKanban className="mb-4 h-5 w-5 text-primary" />
              <p className="font-display text-lg tracking-[-0.04em] text-white">
                루틴 진입
              </p>
            </div>
            <div className="hud-chip rounded-[1.2rem] px-4 py-4">
              <Sparkles className="mb-4 h-5 w-5 text-primary" />
              <p className="font-display text-lg tracking-[-0.04em] text-white">
                제품 완성도
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="brand-kicker">시작 경로</p>
          <CardTitle className="text-3xl">빠른 시작 흐름</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="glass-field rounded-[1.2rem] px-4 py-4">
            <p className="mb-2 text-sm font-medium text-white">1. 빠른 기록</p>
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
              3. 최근 세션 복귀
            </p>
            <p className="text-sm leading-7 text-white/58">
              방금 끝낸 기록을 다시 열어 이어서 입력하거나 검토할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function TrainingSnapshotSection({
  isHydratingOverview,
  trainingSnapshot,
}: TrainingSnapshotSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Training Snapshot"
        title="쌓인 기록이 운동 앱다운 깊이를 만듭니다."
        description="최근 7일 활동, 연속 streak, 루틴별 사용 비중을 홈에서 바로 읽을 수 있게 확장했습니다."
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
              첫 세션을 저장하면 `총 세션`, `최근 7일 활동`, `루틴 사용 비중`이
              이 영역에 쌓입니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <Card>
            <CardHeader>
              <p className="brand-kicker">Overview</p>
              <CardTitle className="text-3xl">핵심 지표</CardTitle>
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
                  최근 7일 동안 {trainingSnapshot.sessionsLast7Days}회 기록했고,{" "}
                  {trainingSnapshot.activeDaysLast7}일 실제로 운동했습니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="brand-kicker">Streak & Activity</p>
              <CardTitle className="text-3xl">최근 흐름 차트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-field rounded-[1.2rem] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/42">
                      현재 streak
                    </span>
                    <Flame className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                    {trainingSnapshot.currentStreak}일
                  </p>
                  <p className="mt-2 text-sm text-white/52">
                    오늘 또는 어제 기준으로 이어지는 연속 운동 일수
                  </p>
                </div>
                <div className="glass-field rounded-[1.2rem] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/42">
                      최고 streak
                    </span>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                    {trainingSnapshot.bestStreak}일
                  </p>
                  <p className="mt-2 text-sm text-white/52">
                    지금까지 가장 길었던 연속 운동 기록
                  </p>
                </div>
              </div>

              <TrainingActivityChart data={trainingSnapshot.recentActivity} />

              <p className="text-sm leading-6 text-white/56">
                세션 수와 볼륨을 함께 보여줘서, 단순 방문 수가 아니라 실제 훈련
                강도 변화도 바로 읽을 수 있게 했습니다.
              </p>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <p className="brand-kicker">Routine Insights</p>
              <CardTitle className="text-3xl">루틴별 사용 비중</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <RoutineShareChart data={trainingSnapshot.routineInsights} />

              <div className="grid gap-3">
                {trainingSnapshot.routineInsights.map((routine) => (
                  <div
                    key={routine.id}
                    className="glass-field rounded-[1.2rem] px-4 py-4"
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium text-white">
                          {routine.label}
                        </p>
                        <p className="text-sm text-white/52">
                          마지막 기록: {formatDateTime(routine.lastTrainedAt)}
                        </p>
                      </div>
                      <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/68">
                        {routine.share}%
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="surface-soft rounded-[1rem] px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/38">
                          세션
                        </p>
                        <p className="mt-2 font-display text-xl tracking-[-0.04em] text-white">
                          {routine.sessionCount}회
                        </p>
                      </div>
                      <div className="surface-soft rounded-[1rem] px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/38">
                          세트
                        </p>
                        <p className="mt-2 font-display text-xl tracking-[-0.04em] text-white">
                          {routine.totalSets}세트
                        </p>
                      </div>
                      <div className="surface-soft rounded-[1rem] px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/38">
                          볼륨
                        </p>
                        <p className="mt-2 font-display text-xl tracking-[-0.04em] text-white">
                          {formatCompactNumber(routine.totalVolume)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-soft flex items-start gap-3 rounded-[1.2rem] px-4 py-4 text-sm text-white/60 xl:col-span-2">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="leading-6">
                  홈에서 자주 쓰는 루틴과 누적 볼륨을 바로 보여줘서, 단순 기록
                  앱이 아니라 실제 운동 패턴을 읽는 제품처럼 보이도록
                  구성했습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function FeaturedRoutineSection({
  isHydratingOverview,
  featuredRoutines,
  startingRoutineId,
  onStartRoutineSession,
}: FeaturedRoutineSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="최근 루틴"
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
      ) : featuredRoutines.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-white/58">
            아직 루틴이 없습니다. `루틴 추가`로 첫 흐름을 만들어 주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {featuredRoutines.map((routine) => (
            <Card key={routine.id}>
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span className="brand-kicker">루틴</span>
                    <CardTitle className="text-3xl">{routine.name}</CardTitle>
                  </div>
                  <span className="hud-chip rounded-[0.9rem] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/66">
                    {routine.sessionCount}회
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
                      void onStartRoutineSession(routine.id);
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
  );
}

export default function HomeView({ overview, sessionStart }: HomeViewProps) {
  return (
    <PageShell
      eyebrow="로컬 우선 운동 기록"
      title="Workout PWA"
      description="포트폴리오용 간판 프로젝트로 보이려면 첫인상뿐 아니라 제품 완성도가 보여야 합니다. 그래서 홈에서 바로 시작, 최근 기록 이어가기, 루틴 기반 시작, 활동 데이터 요약까지 한 화면에 정리했습니다."
      actions={
        <>
          <Button
            type="button"
            size="lg"
            disabled={sessionStart.isStartingQuickSession}
            onClick={() => {
              void sessionStart.startQuickSession();
            }}
          >
            <Dumbbell className="h-4 w-4" />
            {sessionStart.isStartingQuickSession
              ? "세션 시작 중..."
              : "세션 시작"}
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
          <StatPill label="진입" value="홈에서 바로 시작" icon={Dumbbell} />
          <StatPill label="복귀" value="최근 세션 이어가기" icon={History} />
          <StatPill label="복원력" value="오프라인 저장" icon={CloudOff} />
        </>
      }
    >
      {overview.loadErrorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {overview.loadErrorMessage}
          </CardContent>
        </Card>
      ) : null}

      {sessionStart.actionErrorMessage ? (
        <Card className="border-destructive/30 bg-destructive/12">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {sessionStart.actionErrorMessage}
          </CardContent>
        </Card>
      ) : null}

      <RecentSessionSection
        isHydratingOverview={overview.isHydratingOverview}
        latestSession={overview.latestSession}
        routineNameById={overview.routineNameById}
      />
      <TrainingSnapshotSection
        isHydratingOverview={overview.isHydratingOverview}
        trainingSnapshot={overview.trainingSnapshot}
      />
      <FeaturedRoutineSection
        isHydratingOverview={overview.isHydratingOverview}
        featuredRoutines={overview.featuredRoutines}
        startingRoutineId={sessionStart.startingRoutineId}
        onStartRoutineSession={sessionStart.startRoutineSession}
      />
    </PageShell>
  );
}
