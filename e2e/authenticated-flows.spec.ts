import { expect, test } from '@playwright/test';

import { adminAuthFile, customerAuthFile } from './support/auth';

test.describe('authenticated customer flows', () => {
  test.use({ storageState: customerAuthFile });

  test('customer can access cart, checkout, wishlist, orders, and profile areas', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();

    await page.goto('/wishlist');
    await expect(page.getByRole('heading', { name: /wishlist/i })).toBeVisible();

    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /delivery addresses/i })).toBeVisible();
  });
});

test.describe('authenticated admin flows', () => {
  test.use({ storageState: adminAuthFile });

  test('admin can access dashboard sections backed by real admin APIs', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /products/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /categories/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /brands/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /coupons/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /orders/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /users/i })).toBeVisible();
  });
});
