import { defineConfig, devices } from "@playwright/test";

/** When port 3000 is already in use (e.g. `next dev`), set `PW_PORT=3001` before `playwright test`. */
const pwPort = process.env.PW_PORT?.trim() || "3000";
const baseURL = `http://127.0.0.1:${pwPort}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next start -p ${pwPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
