import { defineConfig, devices } from "@playwright/test";

// Smoke + QA-screenshot tests run against a PRODUCTION build served by
// `next start`, WITH NO app env vars — the public /qrcode must stay green in the
// degraded local-config fallback (the whole point of the safety net). The only
// flag set is QA_SCREENSHOT_MODE=1, which unlocks the /qa-gallery route used by
// the screenshot job; it is never a functional app env var and the gallery's
// second gate (VERCEL_ENV !== "production") keeps it unreachable in prod.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/qrcode`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { QA_SCREENSHOT_MODE: "1" },
  },
});
