import { defineConfig } from "@playwright/test";

const testPort = Number(process.env.PLAYWRIGHT_PORT ?? "3000");
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`;
const useDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === "true";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: useDevServer
      ? `npm run dev -- --port ${testPort}`
      : `npm run build && npm run start -- --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: useDevServer && !process.env.CI,
    timeout: useDevServer ? 120_000 : 300_000,
  },
});
