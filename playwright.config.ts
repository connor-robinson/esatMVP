import { defineConfig, devices } from "@playwright/test";

/**
 * Prefer a locally installed Chrome/Edge channel so CI/dev machines do not
 * need to download Playwright's bundled Chromium (often blocked/timeouts).
 */
const channel =
  process.env.PLAYWRIGHT_CHANNEL ||
  (process.platform === "win32" ? "chrome" : "chrome");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(spec|test)\.(ts|js)/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel,
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--disable-features=InterestFeedContentSuggestions,EdgeTrackingPrevention",
        "--disable-background-networking",
      ],
    },
  },
  webServer: {
    command: "npx --yes serve e2e/fixtures -l 4173 --no-port-switching",
    url: "http://127.0.0.1:4173/ga-consent.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 120,
    },
  },
});
