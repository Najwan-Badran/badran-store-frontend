import { defineConfig, devices } from '@playwright/test';

import { loadE2EEnv } from './e2e/support/e2e-env';

loadE2EEnv();

if (process.env['FORCE_COLOR'] && process.env['NO_COLOR']) {
  delete process.env['NO_COLOR'];
}

const baseURL = process.env['E2E_BASE_URL'] || 'http://127.0.0.1:4200';
const startLocalServer = !process.env['E2E_BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: startLocalServer
    ? {
        command: 'npm start -- --host 127.0.0.1 --port 4200',
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /authenticated-flows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authenticated-chromium',
      dependencies: ['setup'],
      testMatch: /authenticated-flows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
