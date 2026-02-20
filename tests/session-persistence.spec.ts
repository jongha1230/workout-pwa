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
  await page
    .getByPlaceholder("루틴 이름 (예: Upper Body)")
    .fill(routineName);
  await page.getByRole("button", { name: "생성" }).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]{36}$/);

  const match = page.url().match(/\/routines\/([^/?#]+)/);
  if (!match) {
    throw new Error("Failed to extract routine id from URL.");
  }

  return match[1];
};

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
  await expect(page.getByRole("button", { name: "세트 추가" })).toHaveCount(
    0,
  );
});

test("missing session id shows not-found guidance", async ({ page }) => {
  const missingSessionId = "11111111-1111-1111-1111-111111111111";
  await page.goto(`/session/${missingSessionId}`);

  await expect(page.getByText("세션을 찾을 수 없습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "세트 추가" })).toHaveCount(
    0,
  );
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

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));

  await page.goto(`/session/${sessionId}`);
  await expect(page.getByPlaceholder("중량 (예: 60)")).toHaveCount(1);
  await expect(page.getByPlaceholder("횟수 (예: 10)")).toHaveCount(1);
  await expect(page.getByPlaceholder("중량 (예: 60)").first()).toHaveValue(
    "65",
  );
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
  await expect(page.getByText("세트를 추가해 주세요.")).toBeVisible();
});
