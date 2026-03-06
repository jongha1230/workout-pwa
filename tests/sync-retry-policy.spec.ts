import { expect, test } from "@playwright/test";

import { isRetryableHttpStatus } from "../src/lib/sync/retry-policy";

test("retry policy maps transient and non-transient status codes", async () => {
  expect(isRetryableHttpStatus(429)).toBe(true);
  expect(isRetryableHttpStatus(500)).toBe(true);
  expect(isRetryableHttpStatus(503)).toBe(true);

  expect(isRetryableHttpStatus(400)).toBe(false);
  expect(isRetryableHttpStatus(401)).toBe(false);
  expect(isRetryableHttpStatus(409)).toBe(false);
});
