import { db, type RoutineRecord } from "@/lib/db";

type CreateRoutineInput = {
  name: string;
  description?: string | null;
};

type UpdateRoutineInput = {
  name?: string;
  description?: string | null;
};

const normalizeDescription = (description?: string | null): string | null => {
  if (!description) return null;
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function createRoutine(
  input: CreateRoutineInput,
): Promise<RoutineRecord> {
  const now = Date.now();
  const record: RoutineRecord = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: normalizeDescription(input.description),
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.put(record);
  return record;
}

export async function getRoutine(id: string): Promise<RoutineRecord | null> {
  const routine = await db.routines.get(id);
  return routine ?? null;
}

export async function listRoutines(): Promise<RoutineRecord[]> {
  return db.routines.orderBy("updatedAt").reverse().toArray();
}

export async function updateRoutine(
  id: string,
  input: UpdateRoutineInput,
): Promise<RoutineRecord | null> {
  const existing = await db.routines.get(id);
  if (!existing) return null;

  const nextRecord: RoutineRecord = {
    ...existing,
    name: input.name ? input.name.trim() : existing.name,
    description:
      input.description !== undefined
        ? normalizeDescription(input.description)
        : existing.description,
    updatedAt: Date.now(),
  };

  await db.routines.put(nextRecord);
  return nextRecord;
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction("rw", db.routines, db.sessions, async () => {
    await db.routines.delete(id);
    await db.sessions.where("routineId").equals(id).delete();
  });
}
