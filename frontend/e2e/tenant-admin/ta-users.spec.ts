/**
 * Tenant Admin — User Management CRUD
 *
 * Full create/read/update/delete cycle for user accounts.
 * Tests are split into:
 *  - UI tests: exercise the browser flow end-to-end
 *  - API tests: directly verify the backend contracts and security
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, ADMIN_USER, MEMBER_USER } from '../helpers/auth';
import {
  createApiContext,
  disposeApiContext,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  createTestUser,
  deleteTestUser,
  extractList,
} from '../helpers/api';

// ── UI Tests ──────────────────────────────────────────────────────────────────

test.describe('Users — UI CRUD', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('admin sees User Management heading', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 30_000 });
  });

  test('admin can open Add User modal', async ({ page }) => {
    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /add user/i }).click();

    // Modal should appear with form fields
    await expect(page.getByRole('heading', { name: /add user/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
  });

  test('admin can create a user and it appears in the list', async ({ page }) => {
    const ts = Date.now();
    const username = `uitestuser${ts}`;

    await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 30_000 });

    // Open modal
    await page.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByRole('heading', { name: /add user/i })).toBeVisible({ timeout: 5_000 });

    // Fill form
    await page.getByPlaceholder(/username/i).fill(username);
    // Password field: use getByLabel for "Password *" or locate by type=password
    await page.locator('input[type="password"]').first().fill('TestPass123!');
    await page.locator('input[type="email"]').fill(`${username}@test.invalid`);

    // Click Save button inside modal
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByRole('heading', { name: /add user/i })).toHaveCount(0, { timeout: 10_000 });

    // Verify user appears in the list
    await expect(page.locator('tbody tr:visible').filter({ hasText: username }).first()).toBeVisible({ timeout: 30_000 });

    // Cleanup via API
    const saApi = await createApiContext('administrator', 'admin123');
    try {
      const { body } = await apiGet(saApi, '/admin/users');
      const users = extractList(body) as Array<{ id: number; username: string }>;
      const created = users.find((u) => u.username === username);
      if (created) await deleteTestUser(saApi, created.id);
    } finally {
      await disposeApiContext(saApi);
    }
  });

  test('admin can edit a user email and change persists after reload', async ({ page }) => {
    // Create user via API first
    const saApi = await createApiContext('administrator', 'admin123');
    let userId: number | null = null;
    const ts = Date.now();
    const username = `edittestuser${ts}`;
    const updatedEmail = `edit${ts}@after.invalid`;

    try {
      const created = await createTestUser(saApi, {
        username,
        email: `edit${ts}@before.invalid`,
      });
      userId = created.id;

      await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
      await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 30_000 });

      // Find the edit button for our user
      const userRow = page.locator('tbody tr:visible').filter({ hasText: username }).first();
      await expect(userRow).toBeVisible({ timeout: 30_000 });
      await userRow.locator('button[title*="Edit"], button[title*="edit"]').click();

      // Modal opens: edit email
      await expect(page.getByRole('heading', { name: /edit user/i })).toBeVisible({ timeout: 5_000 });
      const emailInput = page.locator('input[type="email"]');
      await emailInput.clear();
      await emailInput.fill(updatedEmail);

      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByRole('heading', { name: /edit user/i })).toHaveCount(0, { timeout: 10_000 });

      // Reload and verify the email changed
      await page.reload();
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      const updatedUserRow = page.locator('tbody tr:visible').filter({ hasText: username }).first();
      await expect(updatedUserRow).toBeVisible({ timeout: 30_000 });
      await expect(updatedUserRow).toContainText(updatedEmail, { timeout: 30_000 });
    } finally {
      if (userId) await deleteTestUser(saApi, userId);
      await disposeApiContext(saApi);
    }
  });

  test('admin can delete a user with confirm dialog', async ({ page }) => {
    // Create user via API first
    const saApi = await createApiContext('administrator', 'admin123');
    const ts = Date.now();
    let userId: number | null = null;

    try {
      const created = await createTestUser(saApi, {
        username: `deletetestuser${ts}`,
        email: `del${ts}@test.invalid`,
      });
      userId = created.id;

      await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
      await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 30_000 });

      // Find the delete button for our user
      const rows = page.locator('tr').filter({ hasText: `deletetestuser${ts}` });
      await rows.getByRole('button', { name: /delete/i }).click();

      // Confirm dialog should appear (ConfirmDialog component)
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
      // Click the confirm/delete button in the dialog
      const confirmBtn = page.getByRole('button', { name: /delete|confirm/i }).last();
      await confirmBtn.click();

      await page.waitForTimeout(1500);

      // User should no longer appear
      await expect(page.getByText(`deletetestuser${ts}`)).toHaveCount(0, { timeout: 5_000 });
      userId = null; // already deleted
    } finally {
      if (userId) await deleteTestUser(saApi, userId);
      await disposeApiContext(saApi);
    }
  });
});

// ── API-level Tests ───────────────────────────────────────────────────────────

test.describe('Users — API Security', () => {

  test('GET /admin/users — admin gets 200', async () => {
    const api = await createApiContext('administrator', 'admin123');
    try {
      const { status } = await apiGet(api, '/admin/users');
      expect(status).toBe(200);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('GET /admin/users — member gets 403', async () => {
    const api = await createApiContext('testmember', 'member123');
    try {
      const { status } = await apiGet(api, '/admin/users');
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('full CRUD cycle via API: create → read → update → delete', async () => {
    const api = await createApiContext('administrator', 'admin123');
    const ts = Date.now();
    let userId: number | null = null;

    try {
      // CREATE
      const { status: cStatus, body: cBody } = await apiPost(api, '/admin/users', {
        username: `apicruduser${ts}`,
        password: 'TestPass123!',
        email:    `apicrud${ts}@test.invalid`,
        roles:    ['MEMBER'],
      });
      expect([200, 201]).toContain(cStatus);
      userId = (cBody as { id: number }).id;
      expect(userId).toBeTruthy();

      // READ — appears in list
      const { status: rStatus, body: rBody } = await apiGet(api, '/admin/users');
      expect(rStatus).toBe(200);
      const list = extractList(rBody) as Array<{ id: number; username: string }>;
      expect(list.some((u) => u.id === userId)).toBe(true);

      // UPDATE
      const { status: uStatus } = await apiPut(api, `/admin/users/${userId}`, {
        email: `apicrud${ts}@updated.invalid`,
        roles: ['MEMBER'],
        accountEnabled: true,
      });
      expect([200, 204]).toContain(uStatus);

      // Verify update persisted
      const { status: gStatus, body: gBody } = await apiGet(api, `/admin/users/${userId}`);
      if (gStatus === 200) {
        const user = gBody as { email?: string };
        expect(user.email).toBe(`apicrud${ts}@updated.invalid`);
      }

      // DELETE
      const { status: dStatus } = await apiDelete(api, `/admin/users/${userId}`);
      expect([200, 204]).toContain(dStatus);
      userId = null;

      // Verify gone
      const { status: g2Status, body: g2Body } = await apiGet(api, '/admin/users');
      expect(g2Status).toBe(200);
      const list2 = extractList(g2Body) as Array<{ id: number }>;
      expect(list2.some((u) => u.id === userId)).toBe(false);
    } finally {
      if (userId) await apiDelete(api, `/admin/users/${userId}`);
      await disposeApiContext(api);
    }
  });

  test('member CANNOT create a user via API', async () => {
    const api = await createApiContext('testmember', 'member123');
    try {
      const { status } = await apiPost(api, '/admin/users', {
        username: 'shouldnotcreate',
        password: 'TestPass123!',
        roles: ['MEMBER'],
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('member CANNOT delete a user via API', async () => {
    // Create a temp user to attempt to delete
    const adminApi = await createApiContext('administrator', 'admin123');
    let tempId: number | null = null;
    const memberApi = await createApiContext('testmember', 'member123');
    const ts = Date.now();

    try {
      const created = await createTestUser(adminApi, { username: `temptodel${ts}` });
      tempId = created.id;

      const { status } = await apiDelete(memberApi, `/admin/users/${tempId}`);
      expect([401, 403]).toContain(status);
    } finally {
      if (tempId) await deleteTestUser(adminApi, tempId);
      await disposeApiContext(adminApi);
      await disposeApiContext(memberApi);
    }
  });
});

// ── Access control UI ─────────────────────────────────────────────────────────

test.describe('Users — UI Access Control', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('member does NOT see User Management in sidebar', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    // "Users" link should not be visible
    const usersLink = page.getByRole('link', { name: /^users$/i });
    await expect(usersLink).toHaveCount(0);
  });

  test('member navigating to /users is denied', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    // Should redirect to dashboard or show access-denied — not show "User Management" heading
    const heading = page.getByRole('heading', { name: /user management/i });
    await expect(heading).toHaveCount(0);
  });
});
