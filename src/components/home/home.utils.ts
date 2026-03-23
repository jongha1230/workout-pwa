import type { SessionRecord } from "@/lib/db";

import type {
  RoutineInsight,
  TrainingSnapshot,
} from "@/components/home/home.types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const QUICK_SESSION_ID = "__quick_session__";
const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export const EMPTY_TRAINING_SNAPSHOT: TrainingSnapshot = {
  totalSessions: 0,
  totalRoutines: 0,
  totalSets: 0,
  totalVolume: 0,
  sessionsLast7Days: 0,
  activeDaysLast7: 0,
  currentStreak: 0,
  bestStreak: 0,
  weeklyActivity: [],
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

const getWeekStartTimestamp = (timestamp: number) => {
  const dayStart = getStartOfDayTimestamp(timestamp);
  const dayOfWeek = new Date(dayStart).getDay();
  const offsetFromMonday = (dayOfWeek + 6) % 7;
  return dayStart - offsetFromMonday * DAY_IN_MS;
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
  const currentWeekStart = getWeekStartTimestamp(todayStart);
  const currentWeekEnd = currentWeekStart + 6 * DAY_IN_MS;

  const weeklyActivity = WEEKDAY_LABELS.map((label, index) => {
    const dayStart = currentWeekStart + index * DAY_IN_MS;
    return {
      key: getDateKey(dayStart),
      label,
      sessionCount: 0,
      volume: 0,
    };
  });
  const weeklyActivityByKey = new Map(
    weeklyActivity.map((point) => [point.key, point]),
  );
  const activeDaySet = new Set<number>();
  const activeDaysLast7Set = new Set<number>();
  let sessionsLast7Days = 0;

  const routineInsightMap = sessions.reduce<Record<string, RoutineInsight>>(
    (acc, session) => {
      const dayStart = getStartOfDayTimestamp(session.updatedAt);
      const volume = getSessionVolume(session);
      const routineKey = session.routineId ?? QUICK_SESSION_ID;

      activeDaySet.add(dayStart);

      if (dayStart >= recentWindowStart) {
        sessionsLast7Days += 1;
        activeDaysLast7Set.add(dayStart);
      }

      if (dayStart >= currentWeekStart && dayStart <= currentWeekEnd) {
        const weeklyPoint = weeklyActivityByKey.get(getDateKey(dayStart));
        if (weeklyPoint) {
          weeklyPoint.sessionCount += 1;
          weeklyPoint.volume += volume;
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
  const activeDayTimestamps = [...activeDaySet];
  const activeDaysLast7 = activeDaysLast7Set.size;

  return {
    totalSessions: sessions.length,
    totalRoutines,
    totalSets,
    totalVolume,
    sessionsLast7Days,
    activeDaysLast7,
    currentStreak: computeCurrentStreak(activeDayTimestamps, todayStart),
    bestStreak: computeBestStreak(activeDayTimestamps),
    weeklyActivity,
    routineInsights,
  };
};
