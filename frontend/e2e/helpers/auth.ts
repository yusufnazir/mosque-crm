import { type Page, expect } from '@playwright/test';

export const ADMIN_USER        = { username: 'administrator', password: 'admin123' };
export const TENANT_ADMIN_USER = { username: 'testadmin',     password: 'testadmin123' };
export const MEMBER_USER       = { username: 'testmember',    password: 'member123' };

/**
 * Fill in the login form and wait for a successful redirect to /dashboard.
 * Returns when the dashboard URL is reached.
 */
export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  // 'load' fires after all scripts have loaded and executed — at this point
  // React has hydrated the SSR HTML and the onSubmit handler is attached.
  // The global-setup warm-up ensures JS is pre-compiled so this is fast (~1-2s).
  await page.goto('/login', { waitUntil: 'load', timeout: 30_000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await page.click('button[type="submit"]');
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();

  // Avoid page.waitForFunction here because Playwright's actionTimeout can cap it
  // under full-suite load. Either a redirect away from /login or the app shell
  // becoming visible is enough to treat login as complete.
  await Promise.any([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    }),
    expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 60_000 }),
  ]);

  if (page.url().includes('/login')) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).not.toHaveURL(/login/, { timeout: 30_000 });
  }

  await expect(page).not.toHaveURL(/login/, { timeout: 30_000 });
}

/**
 * Log out via the backend BFF logout endpoint and clear cookies.
 * After this the session cookie is gone and any /dashboard request will redirect to /login.
 */
export async function logout(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  } catch {
    // Ignore cases where there is no active document or storage access is unavailable.
  }
  // Use the browser context request API so logout does not leave an in-flight
  // page navigation behind for the next test.
  try {
    await page.request.get('/api/auth/logout', { timeout: 10_000 });
  } catch {
    // If the BFF is slow or the current session is already gone, continue with local cleanup.
  }
  await page.context().clearCookies();
  // Navigate to login so the next test starts fresh
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10_000 });
  } catch {
    // Cross-subdomain redirects can abort the initial navigation while still
    // landing on the login page. Cleanup should stay best-effort.
  }
  if (page.isClosed()) {
    return;
  }
  try {
    await page.waitForSelector('#username', { state: 'visible', timeout: 10_000 });
  } catch {
    // Best-effort cleanup for afterEach hooks; callers that care about logout
    // correctness should assert the redirect themselves.
  }
}

/**
 * Assert that a sidebar navigation link with the given label is visible.
 */
export async function expectSidebarItem(page: Page, label: string, visible = true): Promise<void> {
  // Target the nav link specifically to avoid matching collapsible group header buttons
  // that may share the same label text (e.g. "Members" group header + "Members" link).
  const item = page.locator('[data-testid="sidebar-nav"]').getByRole('link', { name: label, exact: true });
  if (visible) {
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(item).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(item).not.toBeVisible();
  }
}
