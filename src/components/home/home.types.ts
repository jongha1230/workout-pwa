import type { RoutineRecord, SessionRecord } from "@/lib/db";

export type HomeRoutineSummary = RoutineRecord & {
  sessionCount: number;
};

export type WeeklyActivityPoint = {
  key: string;
  label: string;
  sessionCount: number;
  volume: number;
};

export type RoutineInsight = {
  id: string;
  label: string;
  sessionCount: number;
  totalSets: number;
  totalVolume: number;
  share: number;
  lastTrainedAt: number;
};

export type TrainingSnapshot = {
  totalSessions: number;
  totalRoutines: number;
  totalSets: number;
  totalVolume: number;
  sessionsLast7Days: number;
  activeDaysLast7: number;
  currentStreak: number;
  bestStreak: number;
  weeklyActivity: WeeklyActivityPoint[];
  routineInsights: RoutineInsight[];
};

export type HomeOverviewData = {
  isHydratingOverview: boolean;
  loadErrorMessage: string | null;
  latestSession: SessionRecord | null;
  routineNameById: Record<string, string>;
  featuredRoutines: HomeRoutineSummary[];
  trainingSnapshot: TrainingSnapshot;
};

export type HomeStartSessionActions = {
  isStartingQuickSession: boolean;
  startingRoutineId: string | null;
  actionErrorMessage: string | null;
  startQuickSession: () => Promise<void>;
  startRoutineSession: (routineId: string) => Promise<void>;
  clearActionError: () => void;
};
