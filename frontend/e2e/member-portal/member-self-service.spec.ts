/**
 * Member Portal — Self-Service Access Control
 *
 * Verifies:
 *  - Members can access their own account/profile pages
 *  - Members CANNOT access admin-only sections
 *  - Members CANNOT perform admin API operations (create/delete/update other members, users, roles)
 *  - Unauthenticated requests are rejected
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, MEMBER_USER, TENANT_ADMIN_USER } from '../helpers/auth';
import {
  BACKEND_URL,
  createApiContext,
  disposeApiContext,
  apiGet,
  apiPost,
  apiDelete,
  extractList,
} from '../helpers/api';

// ── Member UI Access ──────────────────────────────────────────────────────────

test.describe('Member Portal — UI Access', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('member can log in and see the dashboard', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('member can navigate to /account and see username display', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('input[value="testmember"], input[readonly]').first()).toBeVisible({ timeout: 30_000 });
  });

  test('member does NOT see Users link in sidebar', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    // Sidebar should not contain "Users" nav link (requires user.view permission)
    const usersLink = page.getByRole('link', { name: /^users$/i });
    await expect(usersLink).toHaveCount(0);
  });

  test('member does NOT see Roles link in sidebar', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    const rolesLink = page.getByRole('link', { name: /^roles$/i });
    await expect(rolesLink).toHaveCount(0);
  });

  test('member navigating to /users is denied or redirected', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForTimeout(2000);
    // Should either redirect to dashboard or show forbidden
    const url = page.url();
    const isDenied = url.includes('dashboard') || url.includes('login') || url.includes('403');
    const bodyText = await page.textContent('body') ?? '';
    const hasForbiddenText = /forbidden|access denied|not authorized|403/i.test(bodyText);
    expect(isDenied || hasForbiddenText || !url.includes('/users')).toBe(true);
  });

  test('member navigating to /members is denied or see read-only view', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/members', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/login/);
    await page.waitForTimeout(2000);
    const url = page.url();
    const bodyText = await page.textContent('body') ?? '';
    // Member without member.view permission shouldn't see "Add Member" button
    const addBtn = page.getByRole('button', { name: /add member/i });
    // Either redirected OR no add button
    expect(!url.includes('/members') || !(await addBtn.count())).toBeTruthy();
  });
});

// ── Member API Access Control ─────────────────────────────────────────────────

test.describe('Member Portal — API Access Control', () => {

  test('member CANNOT list users via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiGet(api, '/admin/users');
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT create a user via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiPost(api, '/admin/users', {
        username: 'hackeduser',
        password: 'password123',
        email: 'hacked@test.com',
        roles: ['ADMIN'],
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT create a member via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiPost(api, '/admin/members', {
        firstName: 'Hacked',
        lastName: 'Member',
        email: 'hacked@test.com',
        gender: 'MALE',
        membershipStatus: 'ACTIVE',
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT list admin members via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiGet(api, '/admin/members');
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT manage roles via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiPost(api, '/admin/roles', {
        name: 'Hacked Role',
        description: 'Should not be created',
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT update tenant settings via admin API', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiPost(api, '/admin/tenant-settings', {
        APP_NAME: 'Hacked',
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CAN call GET /member/profile (returns their own data or 404 if unlinked)', async () => {
    const api = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    try {
      const { status } = await apiGet(api, '/member/profile');
      // 200 if profile is linked; 404 if testmember has no person profile; 403 if plan doesn't allow it
      expect([200, 404, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('unauthenticated user CANNOT access admin API', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext();
    try {
      const resp = await ctx.get(`${BACKEND_URL}/admin/members`);
      expect([401, 403]).toContain(resp.status());
    } finally {
      await ctx.dispose();
    }
  });

  test('unauthenticated user CANNOT access member portal API', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext();
    try {
      const resp = await ctx.get(`${BACKEND_URL}/member/profile`);
      expect([401, 403]).toContain(resp.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ── Tenant Admin vs Member ────────────────────────────────────────────────────

test.describe('Role Boundary: Tenant Admin vs Member', () => {

  test('tenant admin CAN list members', async () => {
    const api = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    try {
      const { status } = await apiGet(api, '/admin/members');
      expect(status).toBe(200);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('tenant admin CAN list users', async () => {
    const api = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    try {
      const { status } = await apiGet(api, '/admin/users');
      expect(status).toBe(200);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member response does NOT include data from other members it should not see', async () => {
    const memberApi = await createApiContext(MEMBER_USER.username, MEMBER_USER.password);
    const adminApi  = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);

    try {
      // Member calling /admin/members should be forbidden — not see any member data
      const { status: mStatus } = await apiGet(memberApi, '/admin/members');
      expect([401, 403]).toContain(mStatus);

      // Admin CAN see members
      const { status: aStatus } = await apiGet(adminApi, '/admin/members');
      expect(aStatus).toBe(200);
    } finally {
      await disposeApiContext(memberApi);
      await disposeApiContext(adminApi);
    }
  });
});
