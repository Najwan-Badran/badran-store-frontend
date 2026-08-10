import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, Page } from '@playwright/test';

export const customerAuthFile = join(process.cwd(), '.playwright', 'auth', 'customer.json');
export const adminAuthFile = join(process.cwd(), '.playwright', 'auth', 'admin.json');

export interface E2ECredentials {
  readonly email: string;
  readonly password: string;
}

export function requireE2ECredentials(role: 'customer' | 'admin'): E2ECredentials {
  const prefix = role === 'customer' ? 'E2E_CUSTOMER' : 'E2E_ADMIN';
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  if (!email || !password) {
    throw new Error(
      `${prefix}_EMAIL and ${prefix}_PASSWORD are required. Copy .env.example to .env, ` +
        'set real backend test credentials, and run npm run e2e:seed when the accounts do not exist.',
    );
  }

  return { email, password };
}

export async function loginAndSaveStorageState(
  page: Page,
  credentials: E2ECredentials,
  storageStatePath: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByRole('textbox', { name: /^password$/i }).fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/home/);

  mkdirSync(dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
}
