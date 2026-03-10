import type { OutboxEvent, SyncAdapter, SyncResult } from "@/lib/sync/types";

export class NoopSyncAdapter implements SyncAdapter {
  async pushEvent(event: OutboxEvent): Promise<SyncResult> {
    void event;
    return { ok: true };
  }
}
