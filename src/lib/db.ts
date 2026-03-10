import Dexie, { type Table } from "dexie";

export type SessionSet = {
  id: string;
  weight: number;
  reps: number;
  completed?: boolean;
};

export type RoutineRecord = {
  id: string;
  name: string;
  description: string | null;
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

    this.syncOutbox = this.table("sync_outbox");
  }
}

export const db = new WorkoutDB();
