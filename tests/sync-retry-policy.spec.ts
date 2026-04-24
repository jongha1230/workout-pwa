import { expect, test } from "@playwright/test";

import {
  MAX_SYNC_ATTEMPTS,
  getRetryDelayMs,
  hasRemainingSyncAttempts,
  isRetryableHttpStatus,
  resolveOutboxFailure,
} from "../src/lib/sync/retry-policy";

test("retry policy maps transient and non-transient status codes", async () => {
  expect(isRetryableHttpStatus(429)).toBe(true);
  expect(isRetryableHttpStatus(500)).toBe(true);
  expect(isRetryableHttpStatus(503)).toBe(true);

  expect(isRetryableHttpStatus(400)).toBe(false);
  expect(isRetryableHttpStatus(401)).toBe(false);
  expect(isRetryableHttpStatus(409)).toBe(false);
});

test("retry policy delays failed events and blocks terminal failures", async () => {
  expect(getRetryDelayMs(1)).toBe(5_000);
  expect(getRetryDelayMs(2)).toBe(15_000);
  expect(getRetryDelayMs(3)).toBe(30_000);
  expect(getRetryDelayMs(99)).toBe(30_000);

  expect(hasRemainingSyncAttempts(MAX_SYNC_ATTEMPTS - 1)).toBe(true);
  expect(hasRemainingSyncAttempts(MAX_SYNC_ATTEMPTS)).toBe(false);

  expect(
    resolveOutboxFailure({
      retryable: true,
      attemptCount: 2,
      error: "Transient upstream failure",
    }),
  ).toEqual({
    status: "failed",
    retryDelayMs: 15_000,
    lastError: "Transient upstream failure",
  });

  expect(
    resolveOutboxFailure({
      retryable: false,
      attemptCount: 1,
      error: "Bad request",
    }),
  ).toEqual({
    status: "blocked",
    retryDelayMs: null,
    lastError: "Bad request",
  });

  expect(
    resolveOutboxFailure({
      retryable: true,
      attemptCount: MAX_SYNC_ATTEMPTS,
      error: "Still failing",
    }),
  ).toEqual({
    status: "blocked",
    retryDelayMs: null,
    lastError: "Max retry attempts exceeded: Still failing",
  });
});
