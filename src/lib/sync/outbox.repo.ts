import {
  db,
  type OutboxEntityType,
  type OutboxEventRecord,
  type OutboxOperation,
} from "@/lib/db";

type AppendOutboxEventInput = {
  entityType: OutboxEntityType;
  entityId: string;
  op: OutboxOperation;
  payload: Record<string, unknown>;
};

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];
const PENDING_STATUSES = new Set<OutboxEventRecord["status"]>([
  "pending",
  "failed",
]);

const getRetryDelayMs = (attemptCount: number): number => {
  const safeAttemptCount = Math.max(1, attemptCount);
  const index = Math.min(safeAttemptCount - 1, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index];
};

const isRetryReady = (event: OutboxEventRecord, now: number): boolean => {
  if (event.status === "pending") return true;
  if (event.status !== "failed") return false;

  const dueAt = event.updatedAt + getRetryDelayMs(event.attemptCount);
  return now >= dueAt;
};

const compactUpdateEvents = async (
  entityType: OutboxEntityType,
  entityId: string,
): Promise<void> => {
  const updateEvents = await db.syncOutbox
    .where("[entityType+entityId+op]")
    .equals([entityType, entityId, "update"])
    .toArray();

  const staleUpdateIds = updateEvents
    .filter((event) => PENDING_STATUSES.has(event.status))
    .map((event) => event.id);

  if (staleUpdateIds.length === 0) return;
  await db.syncOutbox.bulkDelete(staleUpdateIds);
};

export const appendOutboxEvent = async (
  input: AppendOutboxEventInput,
): Promise<OutboxEventRecord> => {
  const now = Date.now();

  if (input.op === "update") {
    await compactUpdateEvents(input.entityType, input.entityId);
  }

  const event: OutboxEventRecord = {
    id: crypto.randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    op: input.op,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    status: "pending",
    lastError: null,
  };

  await db.syncOutbox.put(event);
  return event;
};

export const listOutboxSyncCandidates = async (
  limit = 50,
): Promise<OutboxEventRecord[]> => {
  const now = Date.now();
  const allCandidates = await db.syncOutbox
    .where("status")
    .anyOf("pending", "failed")
    .toArray();

  return allCandidates
    .filter((event) => isRetryReady(event, now))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, limit);
};

export const markOutboxEventProcessing = async (id: string): Promise<void> => {
  await db.syncOutbox.update(id, {
    status: "processing",
    updatedAt: Date.now(),
    lastError: null,
  });
};

export const markOutboxEventSynced = async (id: string): Promise<void> => {
  await db.syncOutbox.update(id, {
    status: "synced",
    updatedAt: Date.now(),
    lastError: null,
  });
};

export const markOutboxEventFailed = async (
  id: string,
  attemptCount: number,
  errorMessage: string,
): Promise<void> => {
  await db.syncOutbox.update(id, {
    status: "failed",
    updatedAt: Date.now(),
    attemptCount,
    lastError: errorMessage,
  });
};

export const resetProcessingOutboxEvents = async (): Promise<void> => {
  const processingEvents = await db.syncOutbox
    .where("status")
    .equals("processing")
    .toArray();

  if (processingEvents.length === 0) return;

  await Promise.all(
    processingEvents.map((event) =>
      db.syncOutbox.update(event.id, {
        status: "pending",
        updatedAt: Date.now(),
      }),
    ),
  );
};

export const getOutboxStatusCounts = async (): Promise<
  Record<OutboxEventRecord["status"], number>
> => {
  const events = await db.syncOutbox.toArray();

  return events.reduce<Record<OutboxEventRecord["status"], number>>(
    (acc, event) => {
      acc[event.status] += 1;
      return acc;
    },
    {
      pending: 0,
      processing: 0,
      failed: 0,
      synced: 0,
    },
  );
};

export const getRetryDelayForAttempt = (attemptCount: number): number =>
  getRetryDelayMs(attemptCount);
