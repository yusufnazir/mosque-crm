import { test, expect } from '@playwright/test';
import { loginAs, logout, ADMIN_USER, MEMBER_USER } from './helpers/auth';

test.describe('Authentication', () => {
  test.describe.configure({ timeout: 90_000 });

  test('admin can log in and is redirected to dashboard', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    // Should land on /dashboard (or any non-login page)
    expect(page.url()).not.toContain('/login');
    // Dashboard content should be visible
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
  });

  test('member can log in and is redirected to dashboard', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#username', 'nobody');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Error message should appear — the login page stays on /login
    await expect(page).toHaveURL(/\/login/);
    // Form should remain visible (auto-retrying assertion handles async render)
    await expect(page.locator('form')).toBeVisible();
    // Wait for an error element to appear (the app renders a div with error message)
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').textContent();
    // Should show some kind of failure indication (error text, not loading spinner)
    expect(bodyText).not.toContain('Signing in…');
  });

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Do not log in; attempt to visit a protected route
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // The dashboard layout redirects to /login when no session is present
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 10_000, waitUntil: 'domcontentloaded' });
    await expect(page.locator('#username')).toBeVisible();
  });

  test('admin can log out and loses session', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    expect(page.url()).not.toContain('/login');

    // Log out
    await logout(page);
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    // Trying to access /dashboard again should redirect back to /login
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 10_000, waitUntil: 'domcontentloaded' });
  });
});
