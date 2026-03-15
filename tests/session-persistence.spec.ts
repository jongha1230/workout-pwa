import { expect, test } from "@playwright/test";

const startSession = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);

  const match = page.url().match(/\/session\/([^/?#]+)/);
  if (!match) {
    throw new Error("Failed to extract session id from URL.");
  }

  return match[1];
};

const createRoutineAndOpenDetail = async (
  page: import("@playwright/test").Page,
) => {
  await page.goto("/routines/new");

  const routineName = `E2E Routine ${Date.now()}`;
  await page.getByPlaceholder("루틴 이름 (예: Upper Body)").fill(routineName);
  await page.getByRole("button", { name: "생성" }).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]{36}$/);

  const match = page.url().match(/\/routines\/([^/?#]+)/);
  if (!match) {
    throw new Error("Failed to extract routine id from URL.");
  }

  return match[1];
};

const readOutboxStatusCounts = async (
  page: import("@playwright/test").Page,
): Promise<{
  pending: number;
  processing: number;
  failed: number;
  synced: number;
}> =>
  page.evaluate(() => {
    const initialCounts = {
      pending: 0,
      processing: 0,
      failed: 0,
      synced: 0,
    };

    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open("workout-pwa");

      openRequest.onerror = () => {
        reject(new Error("Failed to open indexeddb."));
      };

      openRequest.onsuccess = () => {
        const database = openRequest.result;
        if (!database.objectStoreNames.contains("sync_outbox")) {
          resolve(initialCounts);
          return;
        }

        const transaction = database.transaction("sync_outbox", "readonly");
        const store = transaction.objectStore("sync_outbox");
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => {
          reject(new Error("Failed to load outbox events."));
        };

        getAllRequest.onsuccess = () => {
          const events = getAllRequest.result as Array<{
            status?: "pending" | "processing" | "failed" | "synced";
          }>;
          const counts = events.reduce(
            (acc, event) => {
              if (event.status === "pending") acc.pending += 1;
              if (event.status === "processing") acc.processing += 1;
              if (event.status === "failed") acc.failed += 1;
              if (event.status === "synced") acc.synced += 1;
              return acc;
            },
            { ...initialCounts },
          );

          resolve(counts);
        };
      };
    });
  });

const readSessionSnapshot = async (
  page: import("@playwright/test").Page,
  sessionId: string,
): Promise<{
  setCount: number;
  firstWeight: string | null;
  firstReps: string | null;
}> =>
  page.evaluate(async (id) => {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open("workout-pwa");

      openRequest.onerror = () => {
        reject(new Error("Failed to open indexeddb."));
      };

      openRequest.onsuccess = () => {
        const database = openRequest.result;
        const transaction = database.transaction("sessions", "readonly");
        const store = transaction.objectStore("sessions");
        const getRequest = store.get(id);

        getRequest.onerror = () => {
          reject(new Error("Failed to load session snapshot."));
        };

        getRequest.onsuccess = () => {
          const session = getRequest.result as
            | { sets?: Array<{ weight: number; reps: number }> }
            | undefined;

          const firstSet = session?.sets?.[0];
          resolve({
            setCount: session?.sets?.length ?? 0,
            firstWeight:
              firstSet && typeof firstSet.weight === "number"
                ? String(firstSet.weight)
                : null,
            firstReps:
              firstSet && typeof firstSet.reps === "number"
                ? String(firstSet.reps)
                : null,
          });
        };
      };
    });
  }, sessionId);

test("starts a session directly from routine detail", async ({ page }) => {
  const routineId = await createRoutineAndOpenDetail(page);

  await page.getByRole("button", { name: "이 루틴으로 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("link", { name: "루틴으로" })).toHaveAttribute(
    "href",
    `/routines/${routineId}`,
  );
});

test("new session route remains available as fallback entry", async ({
  page,
}) => {
  await page.goto("/session/new");
  await expect(page).toHaveURL(/\/session\/new$/);

  await page.locator("button").first().click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
});

test("invalid session id shows guidance instead of editable form", async ({
  page,
}) => {
  await page.goto("/session/not-a-valid-id");

  await expect(page.getByText("유효하지 않은 세션 ID입니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "세트 추가" })).toHaveCount(0);
});

test("missing session id shows not-found guidance", async ({ page }) => {
  const missingSessionId = "11111111-1111-1111-1111-111111111111";
  await page.goto(`/session/${missingSessionId}`);

  await expect(page.getByText("세션을 찾을 수 없습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "세트 추가" })).toHaveCount(0);
});

test("offline boot works for home, routines, and existing session", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.CI,
    "This scenario requires production service worker registration.",
  );

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await expect
    .poll(async () =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();

  const sessionId = await startSession(page);
  await addAndSaveTwoSets(page, sessionId);
  await page.goto(`/session/${sessionId}`);
  await expect(page.getByText("세트 1")).toBeVisible();
  await expect(page.getByText("세트 2")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("button", { name: "세션 시작" })).toBeVisible();

  await context.setOffline(true);

  await page.reload();
  await expect(page.getByText("Workout PWA")).toBeVisible();
  await expect(page.getByRole("button", { name: "세션 시작" })).toBeVisible();
  await expect(page.getByRole("link", { name: "루틴 보기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "루틴 추가" })).toBeVisible();
  await expect(page.getByText("오프라인입니다")).toHaveCount(0);

  await page.goto("/routines");
  await expect(
    page.getByRole("heading", { name: "루틴", exact: true, level: 1 }),
  ).toBeVisible();

  await page.goto(`/session/${sessionId}`);
  await expect(page.getByText("세트 1")).toBeVisible();
  await expect(page.getByText("세트 2")).toBeVisible();
});

test("offline starts create isolated sessions without id collision", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.CI,
    "This scenario requires production service worker registration.",
  );

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await expect
    .poll(async () =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();

  await startSession(page);
  await expect(page.getByRole("button", { name: "세트 추가" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "세션 시작" })).toBeVisible();

  await context.setOffline(true);

  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const firstSessionMatch = page.url().match(/\/session\/([^/?#]+)/);
  if (!firstSessionMatch) {
    throw new Error("Failed to extract first offline session id.");
  }
  const firstSessionId = firstSessionMatch[1];
  await expect(page.getByText("오프라인입니다")).toHaveCount(0);

  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByPlaceholder("중량 (예: 60)").first().fill("50");
  await page.getByPlaceholder("횟수 (예: 10)").first().fill("10");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const secondSessionMatch = page.url().match(/\/session\/([^/?#]+)/);
  if (!secondSessionMatch) {
    throw new Error("Failed to extract second offline session id.");
  }
  const secondSessionId = secondSessionMatch[1];
  expect(secondSessionId).not.toBe(firstSessionId);
  await expect(page.getByText("오프라인입니다")).toHaveCount(0);

  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByPlaceholder("중량 (예: 60)").first().fill("70");
  await page.getByPlaceholder("횟수 (예: 10)").first().fill("8");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();

  await context.setOffline(false);

  await page.goto(`/session/${firstSessionId}`);
  await expect(page.getByPlaceholder("중량 (예: 60)").first()).toHaveValue(
    "50",
  );
  await expect(page.getByPlaceholder("횟수 (예: 10)").first()).toHaveValue(
    "10",
  );

  await page.goto(`/session/${secondSessionId}`);
  await expect(page.getByPlaceholder("중량 (예: 60)").first()).toHaveValue(
    "70",
  );
  await expect(page.getByPlaceholder("횟수 (예: 10)").first()).toHaveValue("8");
});

test("outbox transitions from pending to synced after online recovery", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.CI,
    "This scenario requires production service worker registration.",
  );

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await expect
    .poll(async () =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();

  await context.setOffline(true);

  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByPlaceholder("중량 (예: 60)").first().fill("40");
  await page.getByPlaceholder("횟수 (예: 10)").first().fill("12");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByPlaceholder("중량 (예: 60)").first().fill("55");
  await page.getByPlaceholder("횟수 (예: 10)").first().fill("9");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();

  const pendingCounts = await readOutboxStatusCounts(page);
  expect(pendingCounts.pending).toBeGreaterThan(0);
  expect(pendingCounts.synced).toBe(0);

  await context.setOffline(false);
  await page.reload();

  await expect
    .poll(async () => await readOutboxStatusCounts(page), { timeout: 15_000 })
    .toEqual(
      expect.objectContaining({
        pending: 0,
        processing: 0,
        failed: 0,
      }),
    );

  const recoveredCounts = await readOutboxStatusCounts(page);
  expect(recoveredCounts.synced).toBeGreaterThanOrEqual(pendingCounts.pending);
});

const addAndSaveTwoSets = async (
  page: import("@playwright/test").Page,
  sessionId: string,
): Promise<void> => {
  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByRole("button", { name: "세트 추가" }).click();

  const weightInputs = page.getByPlaceholder("중량 (예: 60)");
  const repsInputs = page.getByPlaceholder("횟수 (예: 10)");
  await expect(weightInputs).toHaveCount(2);
  await expect(repsInputs).toHaveCount(2);

  await weightInputs.nth(0).fill("60");
  await repsInputs.nth(0).fill("10");
  await weightInputs.nth(1).fill("62.5");
  await repsInputs.nth(1).fill("8");

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
};

test("session persists across reload and re-entry", async ({
  page,
  context,
}) => {
  const sessionId = await startSession(page);
  await addAndSaveTwoSets(page, sessionId);

  await page.goto(`/session/${sessionId}`);
  await expect(page.getByText("세트 1")).toBeVisible();
  await expect(page.getByText("세트 2")).toBeVisible();

  await page.reload();
  await expect(page.getByText("세트 1")).toBeVisible();
  await expect(page.getByText("세트 2")).toBeVisible();

  await page.close();
  const page2 = await context.newPage();
  await page2.goto(`/session/${sessionId}`);

  await expect(page2.getByText("세트 1")).toBeVisible();
  await expect(page2.getByText("세트 2")).toBeVisible();
});

test("set updates and deletes persist to indexeddb", async ({ page }) => {
  const sessionId = await startSession(page);
  await addAndSaveTwoSets(page, sessionId);

  await page.goto(`/session/${sessionId}`);

  const weightInputs = page.getByPlaceholder("중량 (예: 60)");
  await expect(weightInputs).toHaveCount(2);
  await weightInputs.nth(0).fill("65");
  await page.getByRole("button", { name: "삭제" }).nth(1).click();
  await expect(page.getByPlaceholder("중량 (예: 60)")).toHaveCount(1);

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("Saved session successfully")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));

  await expect
    .poll(async () => (await readSessionSnapshot(page, sessionId)).setCount)
    .toBe(1);
  await expect
    .poll(async () => (await readSessionSnapshot(page, sessionId)).firstWeight)
    .toBe("65");
});

test("blank inputs are not saved and show validation error", async ({
  page,
}) => {
  await startSession(page);

  await page.getByRole("button", { name: "세트 추가" }).click();
  await page.getByRole("button", { name: "저장" }).click();

  await expect(page.locator("p.text-destructive")).toHaveText(
    "세트 1: 중량과 횟수를 입력해 주세요.",
  );

  await page.reload();
  await expect(page.getByText("세트를 추가해 주세요")).toBeVisible();
});
