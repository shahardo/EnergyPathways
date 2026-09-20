import { defineConfig, devices } from "@playwright/test";

/**
 * Structural fidelity, visual regression and accessibility gates (T14).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // Expect equal-fidelity screenshots regardless of the OS font hinting an
  // engineer's machine happens to have installed.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Unset except where a dev container's pre-installed Chromium revision
    // doesn't match the installed @playwright/test version's expected
    // revision (see /root/.ccr/README.md) -- normal `npx playwright
    // install` environments, including CI, never need this.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
