import { test, expect } from '@playwright/test';

// Visual regression for the public marketing site. Each test asserts a full
// page screenshot — the first run records the baseline, subsequent runs diff
// against it. To accept a legitimate visual change, run:
//   npm run test:visual:update
// and review the resulting screenshots in the PR.

const PUBLIC_PAGES = [
  { path: '/',         name: 'home' },
  { path: '/pricing',  name: 'pricing' },
  { path: '/features', name: 'features' },
  { path: '/login',    name: 'login' },
];

for (const page of PUBLIC_PAGES) {
  test(`${page.name} matches snapshot`, async ({ page: pw }) => {
    // `networkidle` waits for analytics + GA + FB pixel to settle, which
    // would otherwise vary frame-to-frame.
    await pw.goto(page.path, { waitUntil: 'networkidle' });

    // Hide elements known to vary between runs (date strings, animated
    // gradients). Add selectors here as new flaky elements appear.
    await pw.addStyleTag({
      content: `
        [data-now], [data-time], time { visibility: hidden !important; }
        *, *::before, *::after { animation: none !important; transition: none !important; }
      `,
    });

    await expect(pw).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
    });
  });
}
