import {
  getRetryDelayForAttempt,
  listOutboxSyncCandidates,
  markOutboxEventFailed,
  markOutboxEventProcessing,
  markOutboxEventSynced,
  resetProcessingOutboxEvents,
} from "@/lib/sync/outbox.repo";
import { createSyncAdapter } from "@/lib/sync/adapter-factory";
import type { SyncAdapter } from "@/lib/sync/types";

type SyncEngineState = "idle" | "flushing" | "backoff";
type FlushReason = "startup" | "online" | "manual" | "retry";

const MAX_SYNC_BATCH_SIZE = 50;

class SyncEngine {
  private state: SyncEngineState = "idle";
  private isStarted = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handleOnline = () => {
    void this.flush("online");
  };

  constructor(private readonly adapter: SyncAdapter) {}

  start(): void {
    if (typeof window === "undefined" || this.isStarted) return;

    this.isStarted = true;
    window.addEventListener("online", this.handleOnline);

    void (async () => {
      try {
        await resetProcessingOutboxEvents();
        await this.flush("startup");
      } catch (error) {
        console.error("Failed to initialize sync engine.", error);
      }
    })();
  }

  stop(): void {
    if (typeof window === "undefined" || !this.isStarted) return;

    window.removeEventListener("online", this.handleOnline);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.isStarted = false;
    this.state = "idle";
  }

  async flush(reason: FlushReason = "manual"): Promise<void> {
    if (!this.isStarted) return;
    if (this.state === "flushing") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    void reason;

    this.state = "flushing";
    let retryDelayMs: number | null = null;

    try {
      // batch loop: flush 가능한 이벤트를 모두 처리
      while (true) {
        const events = await listOutboxSyncCandidates(MAX_SYNC_BATCH_SIZE);
        if (events.length === 0) break;

        for (const event of events) {
          await markOutboxEventProcessing(event.id);

          const result = await this.adapter.pushEvent(event);
          if (result.ok) {
            await markOutboxEventSynced(event.id);
            continue;
          }

          const nextAttemptCount = event.attemptCount + 1;
          await markOutboxEventFailed(event.id, nextAttemptCount, result.error);

          if (result.retryable) {
            const delay = getRetryDelayForAttempt(nextAttemptCount);
            retryDelayMs =
              retryDelayMs === null ? delay : Math.min(retryDelayMs, delay);
          }
        }
      }
    } catch (error) {
      const fallbackRetryDelayMs = getRetryDelayForAttempt(1);
      retryDelayMs =
        retryDelayMs === null
          ? fallbackRetryDelayMs
          : Math.min(retryDelayMs, fallbackRetryDelayMs);
      console.error("Sync flush failed unexpectedly.", error);
    }

    if (retryDelayMs !== null) {
      this.scheduleRetry(retryDelayMs);
      return;
    }

    this.state = "idle";
  }

  private scheduleRetry(delayMs: number): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.state = "backoff";
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush("retry");
    }, delayMs);
  }
}

const syncEngine = new SyncEngine(createSyncAdapter());

export const startSyncEngine = (): void => {
  syncEngine.start();
};

export const stopSyncEngine = (): void => {
  syncEngine.stop();
};

export const flushSyncEngine = async (): Promise<void> => {
  await syncEngine.flush("manual");
};
