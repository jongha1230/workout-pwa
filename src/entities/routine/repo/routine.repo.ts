import {
  RoutineTemplateSchema,
  type RoutineTemplateInput,
} from "@/entities/model/routine/model/routine.schema";
import { db, normalizeRoutineExercises, type RoutineRecord } from "@/lib/db";
import { appendOutboxEvent } from "@/lib/sync/outbox.repo";

type CreateRoutineInput = RoutineTemplateInput;
type UpdateRoutineInput = RoutineTemplateInput;

const normalizeRoutineRecord = (routine: RoutineRecord): RoutineRecord => ({
  ...routine,
  description: routine.description ?? null,
  exercises: normalizeRoutineExercises(routine.exercises),
});

const parseRoutineInput = (
  input: CreateRoutineInput | UpdateRoutineInput,
): RoutineTemplateInput => {
  const parsed = RoutineTemplateSchema.parse(input);

  return {
    ...parsed,
    exercises: normalizeRoutineExercises(parsed.exercises),
  };
};

export async function createRoutine(
  input: CreateRoutineInput,
): Promise<RoutineRecord> {
  const now = Date.now();
  const parsedInput = parseRoutineInput(input);
  const record: RoutineRecord = {
    id: crypto.randomUUID(),
    name: parsedInput.name,
    description: parsedInput.description,
    exercises: parsedInput.exercises,
    createdAt: now,
    updatedAt: now,
  };

  await db.routines.put(record);
  await appendOutboxEvent({
    entityType: "routine",
    entityId: record.id,
    op: "create",
    payload: {
      id: record.id,
      name: record.name,
      description: record.description,
      exercises: record.exercises,
      createdAt: record.createdAt,
    },
  });
  return normalizeRoutineRecord(record);
}

export async function getRoutine(id: string): Promise<RoutineRecord | null> {
  const routine = await db.routines.get(id);
  return routine ? normalizeRoutineRecord(routine) : null;
}

export async function listRoutines(): Promise<RoutineRecord[]> {
  const routines = await db.routines.orderBy("updatedAt").reverse().toArray();
  return routines.map(normalizeRoutineRecord);
}

export async function updateRoutine(
  id: string,
  input: UpdateRoutineInput,
): Promise<RoutineRecord | null> {
  const existing = await db.routines.get(id);
  if (!existing) return null;
  const parsedInput = parseRoutineInput(input);

  const nextRecord: RoutineRecord = {
    ...existing,
    name: parsedInput.name,
    description: parsedInput.description,
    exercises: parsedInput.exercises,
    updatedAt: Date.now(),
  };

  await db.routines.put(nextRecord);
  await appendOutboxEvent({
    entityType: "routine",
    entityId: nextRecord.id,
    op: "update",
    payload: {
      id: nextRecord.id,
      name: nextRecord.name,
      description: nextRecord.description,
      exercises: nextRecord.exercises,
      updatedAt: nextRecord.updatedAt,
    },
  });
  return normalizeRoutineRecord(nextRecord);
}

export async function deleteRoutine(id: string): Promise<void> {
  const sessionsToDelete = await db.sessions
    .where("routineId")
    .equals(id)
    .toArray();

  await db.transaction("rw", db.routines, db.sessions, async () => {
    await db.routines.delete(id);
    await db.sessions.where("routineId").equals(id).delete();
  });

  await Promise.all(
    sessionsToDelete.map((session) =>
      appendOutboxEvent({
        entityType: "session",
        entityId: session.id,
        op: "delete",
        payload: {
          id: session.id,
        },
      }),
    ),
  );

  await appendOutboxEvent({
    entityType: "routine",
    entityId: id,
    op: "delete",
    payload: {
      id,
    },
  });
}
