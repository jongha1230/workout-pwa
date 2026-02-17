import { expect, test } from "@playwright/test";

const startSession = async (page: import("@playwright/test").Page) => {
  await page.goto("/session/new");
  await page.getByRole("button", { name: "세션 시작" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);

  const match = page.url().match(/\/session\/([^/?#]+)/);
  if (!match) {
    throw new Error("Failed to extract session id from URL.");
  }

  return match[1];
};

test("session persists across reload and re-entry", async ({
  page,
  context,
}) => {
  const sessionId = await startSession(page);

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
