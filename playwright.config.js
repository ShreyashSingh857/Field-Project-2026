import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev:user',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
