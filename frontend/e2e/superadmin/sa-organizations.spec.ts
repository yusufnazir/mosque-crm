/**
 * Super-Admin — Organizations Management
 *
 * Tests that the super-admin can:
 *  - View the Organizations page
 *  - See the list of organizations
 *  - Create a new organization (full CRUD cycle)
 *  - (Access denied for non-SA users)
 *
 * The /organizations page is SUPER-ADMIN ONLY.
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, ADMIN_USER, TENANT_ADMIN_USER } from '../helpers/auth';
import {
  createApiContext,
  disposeApiContext,
  apiGet,
  apiPost,
  apiDelete,
  extractList,
} from '../helpers/api';

test.describe('Super-Admin — Organization Management', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Visibility ────────────────────────────────────────────────────────────

  test('super-admin sees Organizations link in sidebar', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('[data-testid="sidebar-nav"]').getByRole('link', { name: /organizations/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test('super-admin can navigate to /organizations page', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/organizations', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(
      page.getByRole('heading', { name: /organization/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  // ── List organizations ────────────────────────────────────────────────────

  test('organizations page lists at least one organization', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/organizations', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /organization/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
  });

  // ── API-level: CRUD for organizations ────────────────────────────────────

  test('SA can create and delete an organization via API', async () => {
    const saApi = await createApiContext('administrator', 'admin123');
    const ts = Date.now();
    let createdId: number | null = null;

    try {
      // CREATE
      const { status: createStatus, body: createBody } = await apiPost(saApi, '/organizations', {
        name:   `E2E Org ${ts}`,
        handle: `e2e-org-${ts}`,
        active: true,
      });
      expect([200, 201]).toContain(createStatus);
      createdId = (createBody as { id: number }).id;
      expect(createdId).toBeTruthy();

      // READ — verify it appears in the list
      const { status: listStatus, body: listBody } = await apiGet(saApi, '/organizations');
      expect(listStatus).toBe(200);
      const orgs = extractList(listBody) as Array<{ id: number; name: string }>;
      const found = orgs.find((o) => o.id === createdId);
      expect(found).toBeTruthy();
      expect(found!.name).toBe(`E2E Org ${ts}`);
    } finally {
      // DELETE
      if (createdId) {
        await apiDelete(saApi, `/organizations/${createdId}`);
      }
      await disposeApiContext(saApi);
    }
  });

  // ── Access control ────────────────────────────────────────────────────────

  test('tenant admin does NOT see Organizations in sidebar', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    // Organizations link should not appear for a non-SA user
    const orgLinks = page.getByRole('link', { name: /organizations/i });
    // Either doesn't exist, or is 0 count
    const count = await orgLinks.count();
    expect(count).toBe(0);
  });

  test('SA API — non-SA token gets 403 on /organizations', async () => {
    const memberApi = await createApiContext('testmember', 'member123');
    try {
      const { status } = await apiGet(memberApi, '/organizations');
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(memberApi);
    }
  });

  // ── Role templates (SA-only) ──────────────────────────────────────────────

  test('super-admin sees Role Templates link', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('[data-testid="sidebar-nav"]').getByRole('link', { name: /role.?template/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test('tenant admin does NOT see Role Templates', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    const count = await page.getByRole('link', { name: /role.?template/i }).count();
    expect(count).toBe(0);
  });
});
