import { expect, test } from "@playwright/test";
import "fake-indexeddb/auto";

import { db } from "../src/lib/db";
import {
  appendOutboxEvent,
  getOutboxStatusCounts,
  listOutboxSyncCandidates,
  markOutboxEventBlocked,
  markOutboxEventFailed,
} from "../src/lib/sync/outbox.repo";
import { getRetryDelayMs } from "../src/lib/sync/retry-policy";
import {
  createRoutine,
  deleteRoutine,
} from "../src/entities/routine/repo/routine.repo";
import { createSession } from "../src/entities/session/repo/session.repo";

const clearWorkoutDb = async () => {
  await db.transaction(
    "rw",
    db.sessions,
    db.routines,
    db.syncOutbox,
    async () => {
      await db.sessions.clear();
      await db.routines.clear();
      await db.syncOutbox.clear();
    },
  );
};

test.beforeEach(async () => {
  await clearWorkoutDb();
});

test.afterEach(async () => {
  await clearWorkoutDb();
});

test("retryable failed events re-enter the sync queue only after the backoff delay", async () => {
  const now = 50_000;
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    const event = await appendOutboxEvent({
      entityType: "session",
      entityId: "session-1",
      op: "update",
      payload: {
        id: "session-1",
      },
    });

    await markOutboxEventFailed(event.id, 1, "Transient failure");

    await expect(listOutboxSyncCandidates()).resolves.toEqual([]);

    await db.syncOutbox.update(event.id, {
      updatedAt: now - getRetryDelayMs(1),
    });

    await expect(listOutboxSyncCandidates()).resolves.toEqual([
      expect.objectContaining({
        id: event.id,
        status: "failed",
      }),
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test("blocked events never become sync candidates and counts include them", async () => {
  const pendingEvent = await appendOutboxEvent({
    entityType: "session",
    entityId: "session-pending",
    op: "update",
    payload: {
      id: "session-pending",
    },
  });
  const blockedEvent = await appendOutboxEvent({
    entityType: "session",
    entityId: "session-blocked",
    op: "update",
    payload: {
      id: "session-blocked",
    },
  });

  await markOutboxEventBlocked(blockedEvent.id, 1, "Bad request");

  await expect(listOutboxSyncCandidates()).resolves.toEqual([
    expect.objectContaining({
      id: pendingEvent.id,
      status: "pending",
    }),
  ]);
  await expect(getOutboxStatusCounts()).resolves.toEqual({
    pending: 1,
    processing: 0,
    failed: 0,
    blocked: 1,
    synced: 0,
  });
});

test("routine deletion enqueues delete events for related sessions", async () => {
  const routine = await createRoutine({
    name: "Pull Day",
    description: "Back and biceps",
    exercises: [
      {
        id: "exercise-1",
        name: "Barbell Row",
        order: 0,
        targetSets: 3,
        note: null,
      },
    ],
  });

  const sessionOne = await createSession({
    id: "session-1",
    routineId: routine.id,
  });
  const sessionTwo = await createSession({
    id: "session-2",
    routineId: routine.id,
  });

  await deleteRoutine(routine.id);

  const deleteEvents = (await db.syncOutbox.toArray()).filter(
    (event) => event.op === "delete",
  );

  expect(
    deleteEvents
      .filter((event) => event.entityType === "session")
      .map((event) => event.entityId)
      .sort(),
  ).toEqual([sessionOne.id, sessionTwo.id].sort());
  expect(deleteEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entityType: "routine",
        entityId: routine.id,
        op: "delete",
      }),
    ]),
  );
});
