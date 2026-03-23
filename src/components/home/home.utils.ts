import type { SessionRecord } from "@/lib/db";

import type { RoutineInsight, TrainingSnapshot } from "@/components/home/home.types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const QUICK_SESSION_ID = "__quick_session__";
const weekdayFormatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "short",
});

export const EMPTY_TRAINING_SNAPSHOT: TrainingSnapshot = {
  totalSessions: 0,
  totalRoutines: 0,
  totalSets: 0,
  totalVolume: 0,
  sessionsLast7Days: 0,
  activeDaysLast7: 0,
  currentStreak: 0,
  bestStreak: 0,
  recentActivity: [],
  routineInsights: [],
};

const getDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartOfDayTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const getSessionVolume = (session: SessionRecord) =>
  session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

const computeCurrentStreak = (
  activeDayTimestamps: number[],
  todayStart: number,
) => {
  if (activeDayTimestamps.length === 0) {
    return 0;
  }

  const activeDaySet = new Set(activeDayTimestamps);
  let cursor = todayStart;

  if (!activeDaySet.has(cursor)) {
    const yesterday = todayStart - DAY_IN_MS;
    if (!activeDaySet.has(yesterday)) {
      return 0;
    }
    cursor = yesterday;
  }

  let streak = 0;
  while (activeDaySet.has(cursor)) {
    streak += 1;
    cursor -= DAY_IN_MS;
  }

  return streak;
};

const computeBestStreak = (activeDayTimestamps: number[]) => {
  if (activeDayTimestamps.length === 0) {
    return 0;
  }

  const sorted = [...activeDayTimestamps].sort((left, right) => left - right);
  let best = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] - sorted[index - 1] === DAY_IN_MS) {
      current += 1;
      best = Math.max(best, current);
      continue;
    }

    current = 1;
  }

  return best;
};

export const buildTrainingSnapshot = (
  sessions: SessionRecord[],
  routineNameById: Record<string, string>,
  totalRoutines: number,
): TrainingSnapshot => {
  if (sessions.length === 0 && totalRoutines === 0) {
    return EMPTY_TRAINING_SNAPSHOT;
  }

  const todayStart = getStartOfDayTimestamp(Date.now());
  const recentWindowStart = todayStart - 6 * DAY_IN_MS;

  const recentActivity = Array.from({ length: 7 }, (_, index) => {
    const dayStart = todayStart - (6 - index) * DAY_IN_MS;
    return {
      key: getDateKey(dayStart),
      label: weekdayFormatter.format(new Date(dayStart)),
      sessionCount: 0,
      volume: 0,
    };
  });
  const recentActivityByKey = new Map(
    recentActivity.map((point) => [point.key, point]),
  );
  const activeDaySet = new Set<number>();

  const routineInsightMap = sessions.reduce<Record<string, RoutineInsight>>(
    (acc, session) => {
      const dayStart = getStartOfDayTimestamp(session.updatedAt);
      const volume = getSessionVolume(session);
      const routineKey = session.routineId ?? QUICK_SESSION_ID;

      activeDaySet.add(dayStart);

      if (dayStart >= recentWindowStart) {
        const recentPoint = recentActivityByKey.get(getDateKey(dayStart));
        if (recentPoint) {
          recentPoint.sessionCount += 1;
          recentPoint.volume += volume;
        }
      }

      const previous = acc[routineKey];
      acc[routineKey] = {
        id: routineKey,
        label:
          routineKey === QUICK_SESSION_ID
            ? "빠른 세션"
            : (routineNameById[routineKey] ?? "삭제된 루틴"),
        sessionCount: (previous?.sessionCount ?? 0) + 1,
        totalSets: (previous?.totalSets ?? 0) + session.sets.length,
        totalVolume: (previous?.totalVolume ?? 0) + volume,
        share: 0,
        lastTrainedAt: Math.max(
          previous?.lastTrainedAt ?? 0,
          session.updatedAt,
        ),
      };
      return acc;
    },
    {},
  );

  const routineInsights = Object.values(routineInsightMap)
    .map((item) => ({
      ...item,
      share:
        sessions.length === 0
          ? 0
          : Math.round((item.sessionCount / sessions.length) * 100),
    }))
    .sort((left, right) => {
      if (right.sessionCount !== left.sessionCount) {
        return right.sessionCount - left.sessionCount;
      }
      return right.totalVolume - left.totalVolume;
    })
    .slice(0, 4);

  const totalSets = sessions.reduce(
    (sum, session) => sum + session.sets.length,
    0,
  );
  const totalVolume = sessions.reduce(
    (sum, session) => sum + getSessionVolume(session),
    0,
  );
  const sessionsLast7Days = recentActivity.reduce(
    (sum, point) => sum + point.sessionCount,
    0,
  );
  const activeDayTimestamps = [...activeDaySet];
  const activeDaysLast7 = recentActivity.filter(
    (point) => point.sessionCount > 0,
  ).length;

  return {
    totalSessions: sessions.length,
    totalRoutines,
    totalSets,
    totalVolume,
    sessionsLast7Days,
    activeDaysLast7,
    currentStreak: computeCurrentStreak(activeDayTimestamps, todayStart),
    bestStreak: computeBestStreak(activeDayTimestamps),
    recentActivity,
    routineInsights,
  };
};
