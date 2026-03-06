import type { OutboxEvent, SyncAdapter, SyncResult } from "@/lib/sync/types";

type SupabaseSyncAdapterOptions = {
  url: string;
  anonKey: string;
  tableName?: string;
};

const DEFAULT_SYNC_TABLE = "sync_events";

export class SupabaseSyncAdapter implements SyncAdapter {
  private readonly restEndpoint: string;

  constructor(private readonly options: SupabaseSyncAdapterOptions) {
    const normalizedUrl = options.url.replace(/\/+$/, "");
    const tableName = options.tableName ?? DEFAULT_SYNC_TABLE;
    this.restEndpoint = `${normalizedUrl}/rest/v1/${tableName}`;
  }

  async pushEvent(event: OutboxEvent): Promise<SyncResult> {
    try {
      const response = await fetch(this.restEndpoint, {
        method: "POST",
        headers: {
          apikey: this.options.anonKey,
          Authorization: `Bearer ${this.options.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          id: event.id,
          entity_type: event.entityType,
          entity_id: event.entityId,
          op: event.op,
          payload: event.payload,
          client_created_at: event.createdAt,
          client_updated_at: event.updatedAt,
          client_attempt_count: event.attemptCount,
        }),
      });

      if (response.ok) {
        return { ok: true };
      }

      const isRetryable = response.status === 429 || response.status >= 500;
      return {
        ok: false,
        retryable: isRetryable,
        error: `Supabase sync failed with status ${response.status}`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown sync error";
      return {
        ok: false,
        retryable: true,
        error: message,
      };
    }
  }
}
