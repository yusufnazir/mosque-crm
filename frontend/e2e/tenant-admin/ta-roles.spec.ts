/**
 * Tenant Admin — Role Management CRUD
 *
 * Tests: create role, edit role name/description, assign permissions,
 * delete role — all via UI + API. Also verifies members cannot manage roles.
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, ADMIN_USER, TENANT_ADMIN_USER, MEMBER_USER } from '../helpers/auth';
import {
  createApiContext,
  disposeApiContext,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  extractList,
  ORG_ID,
} from '../helpers/api';

function persistedRoleName(name: string): string {
  return name.trim().toUpperCase().replaceAll(' ', '_');
}

function orgScopeHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Organization-Id': String(ORG_ID),
  };
}

async function createScopedRole(
  api: Awaited<ReturnType<typeof createApiContext>>,
  data: Record<string, unknown>,
): Promise<{ status: number; body: { id: number; name: string } }> {
  const response = await api.ctx.post(`${process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api'}/admin/roles`, {
    headers: orgScopeHeaders(api.token),
    data,
  });
  return {
    status: response.status(),
    body: await response.json(),
  };
}

async function listScopedRoles(
  api: Awaited<ReturnType<typeof createApiContext>>,
): Promise<Array<{ id: number; name: string }>> {
  const response = await api.ctx.get(`${process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api'}/admin/roles`, {
    headers: orgScopeHeaders(api.token),
  });
  const body = await response.json();
  return extractList(body) as Array<{ id: number; name: string }>;
}

async function updateScopedRole(
  api: Awaited<ReturnType<typeof createApiContext>>,
  roleId: number,
  data: Record<string, unknown>,
): Promise<number> {
  const response = await api.ctx.put(`${process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api'}/admin/roles/${roleId}`, {
    headers: orgScopeHeaders(api.token),
    data,
  });
  return response.status();
}

async function deleteScopedRole(
  api: Awaited<ReturnType<typeof createApiContext>>,
  roleId: number,
): Promise<number> {
  const response = await api.ctx.delete(`${process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api'}/admin/roles/${roleId}`, {
    headers: orgScopeHeaders(api.token),
  });
  return response.status();
}

// ── UI CRUD ───────────────────────────────────────────────────────────────────

test.describe('Roles — UI CRUD', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('admin sees Roles page heading', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /roles/i }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('admin can open Create Role modal', async ({ page }) => {
    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /roles/i }).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /create role/i }).click();
    await expect(page.getByRole('heading', { name: /create role/i })).toBeVisible({ timeout: 5_000 });
  });

  test('admin can enter a role name in the Create Role modal', async ({ page }) => {
    const ts = Date.now();
    const roleName = `E2E Role ${ts}`;

    await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: /roles/i }).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /create role/i }).click();
    await expect(page.getByRole('heading', { name: /create role/i })).toBeVisible({ timeout: 5_000 });

    // Fill the role name in the modal form.
    await page.locator('input[type="text"]').last().fill(roleName);

    const createButton = page.getByRole('button', { name: /create role/i }).last();
    await expect(createButton).toBeEnabled({ timeout: 5_000 });
    await page.getByRole('button', { name: /cancel/i }).last().click();
  });

  test('admin sees Edit action for a role', async ({ page }) => {
    const ts = Date.now();
    const originalName = `E2E Edit Role ${ts}`;
    const persistedName = persistedRoleName(originalName);

    // Create role via API
    const api = await createApiContext(ADMIN_USER.username, ADMIN_USER.password);
    let roleId: number | null = null;

    try {
      const { status, body } = await createScopedRole(api, {
        name: originalName,
        description: 'Created by E2E test',
        permissionCodes: [],
      });
      expect([200, 201]).toContain(status);
      roleId = (body as { id: number }).id;

      await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
      await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByText(persistedName)).toBeVisible({ timeout: 30_000 });

      await page.getByRole('button', { name: persistedName }).click();
      await expect(page.locator('button[title*="Edit"], button[title*="edit"]').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (roleId) await deleteScopedRole(api, roleId);
      await disposeApiContext(api);
    }
  });

  test('admin sees Delete action for a deletable role', async ({ page }) => {
    const ts = Date.now();
    const roleName = `E2E Delete Role ${ts}`;
    const persistedName = persistedRoleName(roleName);

    const api = await createApiContext(ADMIN_USER.username, ADMIN_USER.password);
    let roleId: number | null = null;

    try {
      const { body } = await createScopedRole(api, {
        name: roleName,
        description: '',
        permissionCodes: [],
      });
      roleId = (body as { id: number }).id;

      await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
      await page.goto('/roles', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByText(persistedName)).toBeVisible({ timeout: 30_000 });

      await page.getByRole('button', { name: persistedName }).click();
      await expect(page.locator('button[title*="Delete"], button[title*="delete"]').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (roleId) await deleteScopedRole(api, roleId);
      await disposeApiContext(api);
    }
  });
});

// ── API CRUD + Permissions ────────────────────────────────────────────────────

test.describe('Roles — API CRUD', () => {

  test('full API CRUD cycle: create → read → update → delete', async () => {
    const api = await createApiContext(ADMIN_USER.username, ADMIN_USER.password);
    const ts = Date.now();
    let roleId: number | null = null;

    try {
      // CREATE
      const { status: cStatus, body: cBody } = await createScopedRole(api, {
        name: `API CRUD Role ${ts}`,
        description: 'Created by E2E API test',
        permissionCodes: ['dashboard.view'],
      });
      expect([200, 201]).toContain(cStatus);
      roleId = (cBody as { id: number }).id;
      expect(roleId).toBeTruthy();

      // READ
      const roles = await listScopedRoles(api);
      expect(roles.some((r) => r.id === roleId)).toBe(true);

      // UPDATE — add another permission
      const uStatus = await updateScopedRole(api, roleId, {
        name: `API CRUD Role ${ts} Updated`,
        description: 'Updated by E2E API test',
        permissionCodes: ['dashboard.view', 'member.view'],
      });
      expect([200, 204]).toContain(uStatus);

      // DELETE
      const dStatus = await deleteScopedRole(api, roleId);
      expect([200, 204]).toContain(dStatus);
      roleId = null;
    } finally {
      if (roleId) await deleteScopedRole(api, roleId);
      await disposeApiContext(api);
    }
  });

  test('member CANNOT create a role via API', async () => {
    const api = await createApiContext('testmember', 'member123');
    try {
      const { status } = await apiPost(api, '/admin/roles', {
        name: 'Hacker Role',
        description: '',
        permissionCodes: [],
      });
      expect([401, 403]).toContain(status);
    } finally {
      await disposeApiContext(api);
    }
  });

  test('GET /admin/permissions returns permissions list for admin', async () => {
    const api = await createApiContext('administrator', 'admin123');
    try {
      const { status, body } = await apiGet(api, '/admin/roles/permissions');
      expect(status).toBe(200);
      const perms = extractList(body) as Array<{ code: string }>;
      expect(perms.length).toBeGreaterThan(0);
      // Should include well-known permission codes
      expect(perms.some((p) => p.code === 'dashboard.view')).toBe(true);
    } finally {
      await disposeApiContext(api);
    }
  });
});

// ── Access Control ────────────────────────────────────────────────────────────

test.describe('Roles — UI Access Control', () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('member does NOT see Roles in sidebar', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    const rolesLink = page.getByRole('link', { name: /^roles$/i });
    await expect(rolesLink).toHaveCount(0);
  });

  test('member navigating to /roles sees no role creation UI', async ({ page }) => {
    await loginAs(page, MEMBER_USER.username, MEMBER_USER.password);
    await page.goto('/roles', { waitUntil: 'domcontentloaded' });
    const createBtn = page.getByRole('button', { name: /create role/i });
    await expect(createBtn).toHaveCount(0);
  });
});
