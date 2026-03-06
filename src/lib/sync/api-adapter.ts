import { isRetryableHttpStatus } from "@/lib/sync/retry-policy";
import type { OutboxEvent, SyncAdapter, SyncResult } from "@/lib/sync/types";

type ApiSyncAdapterOptions = {
  endpoint?: string;
};

type SyncApiResponse =
  | { ok: true }
  | { ok: false; retryable?: boolean; error?: string };

const DEFAULT_SYNC_ENDPOINT = "/api/sync/outbox";

export class ApiSyncAdapter implements SyncAdapter {
  private readonly endpoint: string;

  constructor(options: ApiSyncAdapterOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_SYNC_ENDPOINT;
  }

  async pushEvent(event: OutboxEvent): Promise<SyncResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as SyncApiResponse | null;

      if (response.ok && payload?.ok === true) {
        return { ok: true };
      }

      if (payload?.ok === false) {
        return {
          ok: false,
          retryable:
            payload.retryable ?? isRetryableHttpStatus(response.status),
          error: payload.error ?? "Sync API responded with a failure payload.",
        };
      }

      return {
        ok: false,
        retryable: isRetryableHttpStatus(response.status),
        error: `Sync API failed with status ${response.status}`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown sync API error";
      return {
        ok: false,
        retryable: true,
        error: message,
      };
    }
  }
}
