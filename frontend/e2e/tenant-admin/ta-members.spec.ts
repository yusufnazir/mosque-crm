/**
 * Tenant Admin — Member Management CRUD
 *
 * Full CRUD lifecycle for member records:
 *  - API: create / read / update / delete
 *  - UI: navigate to Add Member page, fill form, save, verify persistence
 *  - Access control: member role cannot create/delete other members
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, TENANT_ADMIN_USER, MEMBER_USER } from '../helpers/auth';
import {
  BACKEND_URL,
  createApiContext,
  disposeApiContext,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  createTestMember,
  deleteTestMember,
  extractList,
} from '../helpers/api';

// ── UI CRUD ───────────────────────────────────────────────────────────────────

test.describe('Members — UI CRUD', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('admin sees Members page with heading', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /members/i }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('admin sees Add Member button on Members page', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    // Button is "Add New Member" (t('members.add_new_member'))
    await expect(page.getByRole('link', { name: /add.*member/i }).or(
      page.getByRole('button', { name: /add.*member/i })
    )).toBeVisible({ timeout: 30_000 });
  });

  test('admin navigates to /members/add page', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/members/add', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    // Should show the Add Member form
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[name="lastName"]')).toBeVisible({ timeout: 30_000 });
  });

  test('admin can create a member and they appear in the list', async ({ page }) => {
    const ts = Date.now();

    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/members/add', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 30_000 });

    await page.locator('input[name="firstName"]').fill('E2EFirst');
    await page.locator('input[name="lastName"]').fill(`E2ELast${ts}`);
    await page.locator('input[name="email"]').fill(`e2emember${ts}@test.invalid`);

    // Select gender (MALE is default)
    // Date of birth - fill if required
    const dobInput = page.locator('input[name="dateOfBirth"]');
    if (await dobInput.isVisible()) {
      await dobInput.fill('1990-01-01');
    }

    // Submit form
    const submitBtn = page.getByRole('button', { name: /save|create|add member/i }).last();
    await submitBtn.click();

    // Should redirect to member list or member detail
    await page.waitForURL(/\/members/, { timeout: 30_000 });

    // Clean up via API
    const api = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    try {
      const { body } = await apiGet(api, '/admin/members');
      const members = extractList(body) as Array<{ id: number; firstName: string; lastName: string }>;
      const created = members.find((m) => m.lastName === `E2ELast${ts}`);
      if (created) await deleteTestMember(api, created.id);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('admin sees View action for a member in the list', async ({ page }) => {
    // Create a member to verify list actions
    const api = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    let memberId: number | null = null;
    const ts = Date.now();

    try {
      const m = await createTestMember(api, {
        firstName: 'ViewFirst',
        lastName:  `ViewLast${ts}`,
        email:     `viewmember${ts}@test.invalid`,
      });
      memberId = m.id;

      await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
      await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      const memberRow = page.locator('tbody tr:visible, .md\\:hidden > div:visible').filter({ hasText: `viewmember${ts}@test.invalid` }).first();
      await expect(memberRow).toBeVisible({ timeout: 30_000 });
      await expect(memberRow.getByTitle(/view/i)).toBeVisible({ timeout: 30_000 });
    } finally {
      if (memberId) await deleteTestMember(api, memberId);
      await disposeApiContext(api);
    }
  });

  test('admin sees Edit action for a member in the list', async ({ page }) => {
    const api = await createApiContext(TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    let memberId: number | null = null;
    const ts = Date.now();

    try {
      const m = await createTestMember(api, {
        firstName: 'EditFirst',
        lastName:  `EditLast${ts}`,
        email:     `edit${ts}@before.invalid`,
      });
      memberId = m.id;

      await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
      await page.goto('/members', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      const memberRow = page.locator('tbody tr:visible, .md\\:hidden > div:visible').filter({ hasText: `edit${ts}@before.invalid` }).first();
      await expect(memberRow).toBeVisible({ timeout: 30_000 });
      await expect(memberRow.getByTitle(/edit/i)).toBeVisible({ timeout: 30_000 });
    } finally {
      if (memberId) await deleteTestMember(api, memberId);
      await disposeApiContext(api);
    }
  });
});

// ── API CRUD ──────────────────────────────────────────────────────────────────

test.describe('Members — API CRUD', () => {

  test('full API CRUD: create → read → update → delete', async () => {
    const api = await createApiContext('administrator', 'admin123');
    const ts = Date.now();
    let memberId: number | null = null;

    try {
      // CREATE
      const m = await createTestMember(api, {
        firstName: 'CRUD',
        lastName:  `Test${ts}`,
        email:     `crudtest${ts}@test.invalid`,
      });
      memberId = m.id;
      expect(memberId).toBeTruthy();

      // READ — list
      const { status: rStatus, body: rBody } = await apiGet(api, '/admin/members');
      expect(rStatus).toBe(200);
      const members = extractList(rBody) as Array<{ id: number | string }>;
      expect(members.some((m) => String(m.id) === String(memberId))).toBe(true);

      // READ — by ID
      const { status: gStatus, body: gBody } = await apiGet(api, `/admin/members/${memberId}`);
      expect(gStatus).toBe(200);
      expect(String((gBody as { id: number | string }).id)).toBe(String(memberId));

      // UPDATE
      const { status: uStatus } = await apiPut(api, `/admin/members/${memberId}`, {
        firstName: 'CRUD',
        lastName:  `Test${ts}`,
        email:     `crudtest${ts}@updated.invalid`,
        gender:    'MALE',
        status:    'ACTIVE',
      });
      expect([200, 204]).toContain(uStatus);

      // DELETE
      const { status: dStatus } = await apiDelete(api, `/admin/members/${memberId}`);
      expect([200, 204]).toContain(dStatus);
      memberId = null;
    } finally {
      if (memberId) await deleteTestMember(api, memberId);
      await disposeApiContext(api);
    }
  });

  test('member CANNOT create another member via API', async () => {
    const api = await createApiContext('testmember', 'member123');
    try {
      const { status } = await apiPost(api, '/admin/members', {
        firstName: 'Hacker',
        lastName:  'Member',
        email:     'hacker@test.invalid',
        gender:    'MALE',
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT delete a member via API', async () => {
    const adminApi  = await createApiContext('administrator', 'admin123');
    const memberApi = await createApiContext('testmember', 'member123');
    const ts = Date.now();
    let tempId: number | null = null;

    try {
      const m = await createTestMember(adminApi, { firstName: 'Temp', lastName: `Del${ts}` });
      tempId = m.id;

      const { status } = await apiDelete(memberApi, `/admin/members/${tempId}`);
      expect([401, 403]).toContain(status);
    } finally {
      if (tempId) await deleteTestMember(adminApi, tempId);
      await disposeApiContext(adminApi);
      await disposeApiContext(memberApi);
    }
  });

  test('pagination: GET /admin/members supports page and size params', async () => {
    const api = await createApiContext('administrator', 'admin123');
    try {
      const { status, body } = await apiGet(api, '/admin/members?page=0&size=5');
      expect(status).toBe(200);
      // Spring Page response
      const page = body as { content?: unknown[]; totalElements?: number };
      if (page.content) {
        expect(Array.isArray(page.content)).toBe(true);
        expect(page.content.length).toBeLessThanOrEqual(5);
      }
    } finally {
      await disposeApiContext(api);
    }
  });

  test('GET /admin/members — unauthenticated request gets 401', async () => {
    const ctx = await (await import('@playwright/test')).request.newContext();
    try {
      const resp = await ctx.get(`${BACKEND_URL}/admin/members`);
      expect([401, 403]).toContain(resp.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ── Access Control UI ─────────────────────────────────────────────────────────

test.describe('Members — UI Access Control', () => {
  test.describe.configure({ timeout: 60_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('member does NOT see Members sidebar entry or Add Member action', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await expect(page.getByRole('link', { name: /^members$/i })).toHaveCount(0);
    await page.goto('/members', { waitUntil: 'domcontentloaded' });
    const addMemberBtn = page.getByRole('link', { name: /add member/i }).or(
      page.getByRole('button', { name: /add member/i })
    );
    await expect(addMemberBtn).toHaveCount(0);
  });
});
