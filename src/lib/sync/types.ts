import type { OutboxEventRecord } from "@/lib/db";

export type OutboxEvent = OutboxEventRecord;

export type SyncResult =
  | { ok: true }
  | { ok: false; retryable: boolean; error: string };

export interface SyncAdapter {
  pushEvent(event: OutboxEvent): Promise<SyncResult>;
}
