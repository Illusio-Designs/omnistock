import { defineConfig, devices } from '@playwright/test';

// Visual-regression suite. Separate config from playwright.config.ts so:
//   1. Smoke tests don't double as flaky pixel tests when fonts vary.
//   2. The runner can target the production-built app or a deployed preview
//      via PLAYWRIGHT_BASE_URL.
// Run on CI only after the smoke job is green.

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e/visual',
  // Visual tests must be deterministic — no parallelism inside one project.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL,
    // Disable animations + caret blink + mock the system clock for stable
    // screenshots. Set the locale + timezone so date formatting matches
    // across runners.
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    colorScheme: 'light',
    viewport: { width: 1280, height: 800 },
  },

  // Pixel-diff tolerance — defaults are too strict for cross-OS rendering.
  // Adjust per-platform if CI runs on a different OS than developers.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Visual tests run against the production build, not `next dev`,
        // so HMR markers and dev-only banners don't pollute snapshots.
        command: 'npm run build && npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
