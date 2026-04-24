import { expect, test } from "@playwright/test";

import { ApiSyncAdapter } from "../src/lib/sync/api-adapter";

const sampleEvent = {
  id: "outbox-event-1",
  entityType: "session" as const,
  entityId: "session-1",
  op: "update" as const,
  payload: {
    id: "session-1",
  },
  createdAt: 1,
  updatedAt: 1,
  attemptCount: 0,
  status: "pending" as const,
  lastError: null,
};

const createFailureResponse = (status: number, error: string): Response =>
  new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

test.describe("ApiSyncAdapter", () => {
  const originalFetch = globalThis.fetch;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("maps HTTP status codes to retryable flags", async () => {
    const adapter = new ApiSyncAdapter({ endpoint: "/api/sync/outbox" });
    const cases = [
      { status: 500, retryable: true },
      { status: 429, retryable: true },
      { status: 400, retryable: false },
      { status: 401, retryable: false },
      { status: 409, retryable: false },
    ] as const;

    for (const { status, retryable } of cases) {
      globalThis.fetch = (async () =>
        createFailureResponse(status, `status ${status}`)) as typeof fetch;

      await expect(adapter.pushEvent(sampleEvent)).resolves.toEqual({
        ok: false,
        retryable,
        error: `status ${status}`,
      });
    }
  });

  test("treats network errors as retryable", async () => {
    const adapter = new ApiSyncAdapter({ endpoint: "/api/sync/outbox" });

    globalThis.fetch = (async () => {
      throw new Error("Network unreachable");
    }) as typeof fetch;

    await expect(adapter.pushEvent(sampleEvent)).resolves.toEqual({
      ok: false,
      retryable: true,
      error: "Network unreachable",
    });
  });

  test("respects server supplied retryable overrides", async () => {
    const adapter = new ApiSyncAdapter({ endpoint: "/api/sync/outbox" });

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ok: false,
          retryable: false,
          error: "Sync route is disabled.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )) as typeof fetch;

    await expect(adapter.pushEvent(sampleEvent)).resolves.toEqual({
      ok: false,
      retryable: false,
      error: "Sync route is disabled.",
    });
  });
});
