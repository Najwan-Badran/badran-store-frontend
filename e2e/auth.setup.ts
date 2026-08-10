import { test as setup } from '@playwright/test';

import {
  adminAuthFile,
  customerAuthFile,
  loginAndSaveStorageState,
  requireE2ECredentials,
} from './support/auth';

setup('authenticate customer', async ({ page }) => {
  await loginAndSaveStorageState(page, requireE2ECredentials('customer'), customerAuthFile);
});

setup('authenticate admin', async ({ page }) => {
  await loginAndSaveStorageState(page, requireE2ECredentials('admin'), adminAuthFile);
});
