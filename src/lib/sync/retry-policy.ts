export const RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const;
export const MAX_SYNC_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

export const isRetryableHttpStatus = (status: number): boolean =>
  status === 429 || status >= 500;

export const getRetryDelayMs = (attemptCount: number): number => {
  const safeAttemptCount = Math.max(1, attemptCount);
  const index = Math.min(safeAttemptCount - 1, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index];
};

export const hasRemainingSyncAttempts = (attemptCount: number): boolean =>
  attemptCount < MAX_SYNC_ATTEMPTS;

type ResolveOutboxFailureInput = {
  retryable: boolean;
  attemptCount: number;
  error: string;
};

export type ResolvedOutboxFailure =
  | {
      status: "failed";
      retryDelayMs: number;
      lastError: string;
    }
  | {
      status: "blocked";
      retryDelayMs: null;
      lastError: string;
    };

export const resolveOutboxFailure = ({
  retryable,
  attemptCount,
  error,
}: ResolveOutboxFailureInput): ResolvedOutboxFailure => {
  if (!retryable) {
    return {
      status: "blocked",
      retryDelayMs: null,
      lastError: error,
    };
  }

  if (!hasRemainingSyncAttempts(attemptCount)) {
    return {
      status: "blocked",
      retryDelayMs: null,
      lastError: `Max retry attempts exceeded: ${error}`,
    };
  }

  return {
    status: "failed",
    retryDelayMs: getRetryDelayMs(attemptCount),
    lastError: error,
  };
};
