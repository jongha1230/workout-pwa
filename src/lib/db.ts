import Dexie, { type Table } from "dexie";

export type SessionSet = {
  id: string;
  weight: number;
  reps: number;
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

  constructor() {
    super("workout-pwa");
    this.version(1).stores({
      // primary key: id
      sessions: "id, updatedAt, createdAt, routineId",
    });
  }
}

export const db = new WorkoutDB();
