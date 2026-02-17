import { db, type SessionRecord, type SessionSet } from "@/lib/db";

type CreateSessionInput = {
  id: string;
  routineId: string | null;
};

type GetLatestSessionByRoutineOptions = {
  excludeSessionId?: string;
  requireSets?: boolean;
};

const cloneSets = (sets: SessionSet[]): SessionSet[] =>
  sets.map((item) => ({
    id: item.id,
    weight: item.weight,
    reps: item.reps,
  }));

export async function createSession(
  input: CreateSessionInput,
): Promise<SessionRecord> {
  const now = Date.now();
  const record: SessionRecord = {
    id: input.id,
    routineId: input.routineId,
    createdAt: now,
    updatedAt: now,
    sets: [],
  };

  await db.sessions.put(record);
  return record;
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const session = await db.sessions.get(id);
  return session ?? null;
}

export async function listSessions(): Promise<SessionRecord[]> {
  return db.sessions.orderBy("updatedAt").reverse().toArray();
}

export async function listSessionsByRoutine(
  routineId: string,
): Promise<SessionRecord[]> {
  const sessions = await db.sessions
    .where("routineId")
    .equals(routineId)
    .sortBy("updatedAt");
  return sessions.reverse();
}

export async function getLatestSessionByRoutine(
  routineId: string,
  options: GetLatestSessionByRoutineOptions = {},
): Promise<SessionRecord | null> {
  const sessions = await listSessionsByRoutine(routineId);

  for (const session of sessions) {
    if (options.excludeSessionId && session.id === options.excludeSessionId) {
      continue;
    }

    const requiresSets = options.requireSets ?? true;
    if (requiresSets && session.sets.length === 0) {
      continue;
    }

    return session;
  }

  return null;
}

export async function upsertSessionSets(
  sessionId: string,
  sets: SessionSet[],
): Promise<SessionRecord> {
  const now = Date.now();
  const nextSets = cloneSets(sets);
  const existing = await db.sessions.get(sessionId);

  if (!existing) {
    const record: SessionRecord = {
      id: sessionId,
      routineId: null,
      createdAt: now,
      updatedAt: now,
      sets: nextSets,
    };

    await db.sessions.put(record);
    return record;
  }

  const nextRecord: SessionRecord = {
    ...existing,
    sets: nextSets,
    updatedAt: now,
  };

  await db.sessions.put(nextRecord);
  return nextRecord;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.sessions.delete(sessionId);
}
