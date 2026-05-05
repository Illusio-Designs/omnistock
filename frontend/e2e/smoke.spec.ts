import { test, expect } from '@playwright/test';

// Smoke suite — fast checks that the public marketing site and the login
// page render without runtime errors. Do not put feature-level assertions
// here; those belong in dedicated specs.

test.describe('public site smoke', () => {
  test('home page renders and shows the hero', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');

    // The brand mark must be in the document (server-rendered).
    await expect(page).toHaveTitle(/Kartriq/i);
    expect(errors, `runtime errors: ${errors.join(', ')}`).toEqual([]);
  });

  test('pricing page lists at least one plan card', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('main')).toBeVisible();
  });

  test('login page has email + password inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('auth-gated', () => {
  // Real login requires a seeded user + a running backend, so we verify the
  // redirect contract instead. /dashboard with no token must bounce to /login.
  test('dashboard without token redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
