import Dexie, { type Table } from "dexie";

export type SessionSet = {
  id: string;
  weight: number;
  reps: number;
  completed?: boolean;
};

export type RoutineExerciseRecord = {
  id: string;
  name: string;
  order: number;
  targetSets: number;
  note: string | null;
};

export const normalizeRoutineExercises = (
  exercises: RoutineExerciseRecord[] | undefined,
): RoutineExerciseRecord[] => {
  if (!Array.isArray(exercises)) {
    return [];
  }

  return exercises
    .filter(
      (exercise) =>
        typeof exercise?.id === "string" &&
        exercise.id.length > 0 &&
        typeof exercise?.name === "string" &&
        exercise.name.trim().length > 0,
    )
    .sort((left, right) => {
      const leftOrder = Number.isInteger(left.order) ? left.order : 0;
      const rightOrder = Number.isInteger(right.order) ? right.order : 0;
      return leftOrder - rightOrder;
    })
    .map((exercise, index) => ({
      id: exercise.id,
      name: exercise.name.trim(),
      order: index,
      targetSets:
        Number.isInteger(exercise.targetSets) && exercise.targetSets > 0
          ? exercise.targetSets
          : 1,
      note:
        typeof exercise.note === "string" && exercise.note.trim().length > 0
          ? exercise.note.trim()
          : null,
    }));
};

export type RoutineRecord = {
  id: string;
  name: string;
  description: string | null;
  exercises: RoutineExerciseRecord[];
  createdAt: number; // Date.now()
  updatedAt: number; // Date.now()
};

export type SessionRecord = {
  id: string;
  routineId: string | null;
  createdAt: number; // Date.now()
  sets: SessionSet[];
  updatedAt: number; // Date.now()
};

export type OutboxEntityType = "session" | "routine";
export type OutboxOperation = "create" | "update" | "delete";
export type OutboxStatus = "pending" | "processing" | "failed" | "synced";

export type OutboxEventRecord = {
  id: string;
  entityType: OutboxEntityType;
  entityId: string;
  op: OutboxOperation;
  payload: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  status: OutboxStatus;
  lastError: string | null;
};

class WorkoutDB extends Dexie {
  sessions!: Table<SessionRecord, string>;
  routines!: Table<RoutineRecord, string>;
  syncOutbox!: Table<OutboxEventRecord, string>;

  constructor() {
    super("workout-pwa");
    this.version(1).stores({
      // primary key: id
      sessions: "id, updatedAt, createdAt, routineId",
    });
    this.version(2).stores({
      sessions: "id, updatedAt, createdAt, routineId",
      routines: "id, updatedAt, createdAt, name",
    });
    this.version(3).stores({
      sessions: "id, updatedAt, createdAt, routineId",
      routines: "id, updatedAt, createdAt, name",
      sync_outbox:
        "id, status, createdAt, updatedAt, entityType, entityId, op, [entityType+entityId+op], [status+updatedAt]",
    });
    this.version(4)
      .stores({
        sessions: "id, updatedAt, createdAt, routineId",
        routines: "id, updatedAt, createdAt, name",
        sync_outbox:
          "id, status, createdAt, updatedAt, entityType, entityId, op, [entityType+entityId+op], [status+updatedAt]",
      })
      .upgrade(async (tx) => {
        await tx
          .table("routines")
          .toCollection()
          .modify(
            (
              routine: RoutineRecord & { exercises?: RoutineExerciseRecord[] },
            ) => {
              routine.exercises = normalizeRoutineExercises(routine.exercises);
            },
          );
      });

    this.syncOutbox = this.table("sync_outbox");
  }
}

export const db = new WorkoutDB();
