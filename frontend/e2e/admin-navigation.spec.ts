import { test, expect } from '@playwright/test';
import { loginAs, logout, expectSidebarItem, ADMIN_USER, TENANT_ADMIN_USER } from './helpers/auth';

/**
 * Tests that verify an admin user can access all administrative sections.
 *
 * Each test logs in fresh as admin to avoid session bleed between specs.
 */
test.describe('Admin Role — Navigation & Access', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('admin sees dashboard and it loads successfully', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    // Dashboard has a nav sidebar
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
    // Should not redirect to login
    expect(page.url()).not.toContain('/login');
  });

  test('admin sidebar shows Members navigation item', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await expectSidebarItem(page, 'Members');
  });

  test('admin sidebar shows Users navigation item', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await expectSidebarItem(page, 'Users');
  });

  test('admin sidebar shows Roles navigation item', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await expectSidebarItem(page, 'Roles');
  });

  test('admin can navigate to /users page', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('admin can navigate to /roles page', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('admin can navigate to /members page', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('admin can navigate to /export page', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/export', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('admin /users page loads user data from backend', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: 'User Management', exact: true })).toBeVisible();
    await expect(page.getByText('Authentication required')).not.toBeVisible();
    await expect(
      page.locator('tbody tr').filter({ hasText: TENANT_ADMIN_USER.username }).first()
    ).toBeVisible();
  });

  test('admin /members page loads member data from backend', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
    await expect(page.getByText('Authentication required')).not.toBeVisible();
    await expect(page.getByText('Access denied')).not.toBeVisible();
    await expect(page.locator('tbody tr:visible, .md\\:hidden > div:visible').first()).toBeVisible({ timeout: 30_000 });
  });
});
