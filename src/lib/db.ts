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

class WorkoutDB extends Dexie {
  sessions!: Table<SessionRecord, string>;
  routines!: Table<RoutineRecord, string>;

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
  }
}

export const db = new WorkoutDB();
