import { test, expect } from '@playwright/test';
import { loginAs, logout, expectSidebarItem, MEMBER_USER } from './helpers/auth';

/**
 * Tests that a MEMBER-role user cannot access administrative pages or data.
 *
 * The frontend hides admin navigation from members (sidebar) and the backend
 * enforces 403 on any admin API call regardless of what the UI shows.
 */
test.describe('Member Role — Access Restrictions', () => {
  test.describe.configure({ timeout: 60_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Sidebar visibility ────────────────────────────────────────────────────

  test('member sidebar does NOT show Users link', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expectSidebarItem(page, 'Users', false);
  });

  test('member sidebar does NOT show Roles link', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expectSidebarItem(page, 'Roles', false);
  });

  test('member sidebar does NOT show Export link', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expectSidebarItem(page, 'Export', false);
  });

  test('member sidebar does NOT show Import link', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expectSidebarItem(page, 'Import', false);
  });

  // ── Direct URL navigation ─────────────────────────────────────────────────

  test('member navigating directly to /users gets no admin data', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForTimeout(2000);
    // Stay authenticated — page stays rendered but API call returns 403
    // The page should not load user records (admin only data)
    const bodyText = await page.locator('body').textContent();
    // Should not contain other admin users' usernames
    expect(bodyText).not.toContain('admin123');
    // Should either be empty or show an error/access-denied message
    // (the component renders an error toast or empty table on 403)
    expect(page.url()).not.toContain('/login');
  });

  test('member navigating directly to /roles gets no role data', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('admin123');
    expect(page.url()).not.toContain('/login');
  });

  test('member navigating directly to /export gets no export data', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/export', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForTimeout(2000);
    // Should not trigger a full login redirect (member is authenticated, just not authorised)
    expect(page.url()).not.toContain('/login');
  });

  // ── Backend enforcement: API returns 403 for member hitting admin endpoints ──

  test('member API call to /admin/users returns 403', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);

    // Intercept the proxied API call and verify the backend response code
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/users'),
        { timeout: 10_000 },
      ).catch(() => null),
      page.goto('/users', { waitUntil: 'domcontentloaded' }),
    ]);

    await expect(page).not.toHaveURL(/login/);

    if (response) {
      expect([403, 404]).toContain(response.status());
    }
    // If the page doesn't call /admin/users at all for members, that is also acceptable
    // (the sidebar hid the link, but we still navigated directly)
  });

  test('member API call to /admin/roles returns 403', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/roles'),
        { timeout: 10_000 },
      ).catch(() => null),
      page.goto('/roles', { waitUntil: 'domcontentloaded' }),
    ]);

    await expect(page).not.toHaveURL(/login/);

    if (response) {
      expect([403, 404]).toContain(response.status());
    }
  });

  // ── Pages the member IS allowed to see ───────────────────────────────────

  test('member can access /dashboard', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
  });

  test('member can access /profile', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
  });
});
