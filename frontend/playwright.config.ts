import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.test so PLAYWRIGHT_BACKEND_URL and BACKEND_URL are available
// before the config object (and webServer) are evaluated.
const envTestPath = path.join(__dirname, '.env.test');
if (fs.existsSync(envTestPath)) {
  const lines = fs.readFileSync(envTestPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api';

/**
 * Playwright E2E configuration.
 *
 * Before running tests, start BOTH services pointing to the TEST database:
 *
 *   # 1. Start the test backend (mcrm-test DB, port 8201, clean schema on start)
 *   cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=test
 *   # OR use the convenience script from the repo root:
 *   .\start-test-backend.ps1
 *
 *   # 2. Start the frontend proxying to the test backend
 *   cd frontend && npm run dev:test
 *
 *   # 3. Run the tests
 *   cd frontend && npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  /* Run tests sequentially — avoid flakiness from concurrent sessions sharing state */
  workers: 1,
  /* Fail the suite if any test is flaky */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://admin.lvh.me:3002',
    /* Capture trace on first retry for debugging */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Generous timeout — Next.js SSR + BFF proxy + Spring Boot can be slow on first hit */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  expect: {
    /* AuthContext calls /api/me after redirect to dashboard — give assertions more time */
    timeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Block Google Fonts CDN so the browser's `load` event fires promptly.
          // Without this, `page.goto` waits 30s for fonts.googleapis.com to respond,
          // causing all tests to time out.
          args: [
            '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1',
          ],
        },
      },
    },
  ],
});
