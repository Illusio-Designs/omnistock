import { defineConfig, devices } from '@playwright/test';

// Smoke-test config — runs against a locally-running dev server (port 3000)
// or whatever PLAYWRIGHT_BASE_URL points at. Keep this small and fast.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  // Visual specs live in e2e/visual and are run by playwright.visual.config.ts.
  testIgnore: ['**/visual/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Block third-party scripts so the smoke suite doesn't depend on
    // GA / FB Pixel / Clarity being reachable.
    extraHTTPHeaders: { 'x-playwright': '1' },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Spin up the dev server if it's not already running. CI sets the
  // PLAYWRIGHT_BASE_URL var, so this only kicks in locally.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
