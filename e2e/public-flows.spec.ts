import { expect, test } from '@playwright/test';

test.describe('public commerce flows', () => {
  test('guest can navigate home, products, login, and register', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByRole('link', { name: /badran store home/i })).toBeVisible();
    const primaryProductsLink = page.getByRole('navigation', { name: /primary navigation/i }).getByRole('link', {
      name: /^products$/i,
    });
    await expect(primaryProductsLink).toBeVisible();

    await primaryProductsLink.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('main')).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('region', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible();

    await page.goto('/register');
    await expect(page.getByRole('region', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('protected customer route redirects guests to login', async ({ page }) => {
    await page.goto('/cart');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('region', { name: /sign in/i })).toBeVisible();
  });

  test('public error and offline pages render accessible recovery actions', async ({ page }) => {
    await page.goto('/403');
    await expect(page.getByRole('heading', { name: /access denied/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();

    await page.goto('/500');
    await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();

    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /connection restored|you are offline/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse products/i })).toBeVisible();
  });
});
