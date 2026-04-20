/**
 * Raw API call helpers for test setup and teardown.
 *
 * These are used in global-setup.ts and in beforeAll/afterAll hooks to
 * provision and clean up test data via the backend REST API, avoiding
 * slow UI interactions for setup code.
 *
 * Backend URL is read from PLAYWRIGHT_BACKEND_URL (set in .env.test),
 * falling back to http://localhost:8201/api (the test profile port).
 *
 * To use the dev backend instead, set PLAYWRIGHT_BACKEND_URL=http://localhost:8200/api
 */
import { request as playwrightRequest, APIRequestContext } from '@playwright/test';

export const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8201/api';
export const ORG_HANDLE   = 'admin';       // subdomain that resolves to org id=1
export const ORG_ID       = 1;

// ─── Role names (from seed data) ─────────────────────────────────────────────
export const ROLE = {
  ADMIN:       'ADMIN',
  MEMBER:      'MEMBER',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

// ─── Plan codes ───────────────────────────────────────────────────────────────
export const PLAN = {
  FREE:    'FREE',
  STARTER: 'STARTER',
  GROWTH:  'GROWTH',
  PRO:     'PRO',
} as const;

// ─── Context ──────────────────────────────────────────────────────────────────
export interface ApiContext {
  token:     string;
  orgHandle: string | null;
  ctx:       APIRequestContext;
}

export async function createApiContext(
  username: string,
  password: string,
  handle?: string,
): Promise<ApiContext> {
  const ctx = await playwrightRequest.newContext();
  const resp = await ctx.post(`${BACKEND_URL}/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
      ...(handle ? { 'X-Mosque-Handle': handle } : {}),
    },
    data: { username, password },
  });
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`Login failed for ${username}: ${resp.status()} ${body}`);
  }
  const body = await resp.json();
  return { token: body.token, orgHandle: handle ?? body.organizationHandle ?? null, ctx };
}

export async function disposeApiContext(api: ApiContext): Promise<void> {
  await api.ctx.dispose();
}

/** Build auth headers — optionally include org handle for tenant-scoped calls. */
export function authHeaders(token: string, handle?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(handle ? { 'X-Mosque-Handle': handle } : {}),
  };
}

// ─── Generic request helpers ─────────────────────────────────────────────────

export async function apiGet(
  api:    ApiContext,
  path:   string,
  handle?: string,
): Promise<{ status: number; body: unknown }> {
  const resp = await api.ctx.get(`${BACKEND_URL}${path}`, {
    headers: authHeaders(api.token, handle ?? api.orgHandle ?? undefined),
  });
  let body: unknown = null;
  try { body = await resp.json(); } catch { /* binary / empty */ }
  return { status: resp.status(), body };
}

export async function apiPost(
  api:    ApiContext,
  path:   string,
  data:   Record<string, unknown>,
  handle?: string,
): Promise<{ status: number; body: unknown }> {
  const resp = await api.ctx.post(`${BACKEND_URL}${path}`, {
    headers: authHeaders(api.token, handle ?? api.orgHandle ?? undefined),
    data,
  });
  let body: unknown = null;
  try { body = await resp.json(); } catch { /* empty */ }
  return { status: resp.status(), body };
}

export async function apiPut(
  api:    ApiContext,
  path:   string,
  data:   Record<string, unknown>,
  handle?: string,
): Promise<{ status: number; body: unknown }> {
  const resp = await api.ctx.put(`${BACKEND_URL}${path}`, {
    headers: authHeaders(api.token, handle ?? api.orgHandle ?? undefined),
    data,
  });
  let body: unknown = null;
  try { body = await resp.json(); } catch { /* empty */ }
  return { status: resp.status(), body };
}

export async function apiDelete(
  api:    ApiContext,
  path:   string,
  handle?: string,
): Promise<{ status: number }> {
  const resp = await api.ctx.delete(`${BACKEND_URL}${path}`, {
    headers: authHeaders(api.token, handle ?? api.orgHandle ?? undefined),
  });
  return { status: resp.status() };
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

/** Returns array of users (handles both plain array and Spring Page). */
export function extractList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const page = body as { content?: unknown[] };
  if (page?.content) return page.content;
  return [];
}

/** Creates the E2E test organisation if it does not already exist.  Returns the org id. */
export async function ensureTestOrg(saApi: ApiContext): Promise<number> {
  const { body: raw } = await apiGet(saApi, '/organizations');
  const orgs = extractList(raw) as Array<{ id: number; name: string }>;
  const existing = orgs.find((o) => o.name === 'E2E Test Organisation');
  if (existing) return existing.id;

  const { status, body } = await apiPost(saApi, '/organizations', {
    name:   'E2E Test Organisation',
    handle: 'e2etest',
    active: true,
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`Could not create test org: ${status} ${JSON.stringify(body)}`);
  }
  return (body as { id: number }).id;
}

/**
 * Ensures the test org has an active high-capacity subscription with billing
 * disabled. FREE only allows a single user in seeded entitlements, which breaks
 * E2E setup when we provision both testadmin and testmember.
 */
export async function ensureTestSubscription(saApi: ApiContext, orgId: number): Promise<void> {
  const { status, body } = await apiPost(saApi, '/admin/subscription', {
    organizationId: orgId,
    planCode:       PLAN.GROWTH,
    billingCycle:   'MONTHLY',
    billingEnabled: false,   // billingEnabled=false → interceptor always allows access
  });
  if (status !== 200 && status !== 201) {
    console.warn(`[ensureTestSubscription] unexpected status=${status}: ${JSON.stringify(body)}`);
  }
}

/** Creates testmember (MEMBER role) if it does not already exist.  Returns the user id. */
export async function ensureTestMember(saApi: ApiContext, orgId: number): Promise<number> {
  const { body: raw } = await apiGet(saApi, '/admin/users');
  const users = extractList(raw) as Array<{ id: number; username: string; organizationId?: number }>;  
  const existing = users.find((u) => u.username === 'testmember');
  const existingId = existing?.id;

  if (!existingId) {
    const { status, body } = await apiPost(saApi, '/admin/users', {
      username:       'testmember',
      password:       'member123',
      email:          'testmember@e2e.test',
      roles:          [ROLE.MEMBER],
      organizationId: orgId,
    });
    if (status !== 200 && status !== 201) {
      throw new Error(`Could not create testmember: ${status} ${JSON.stringify(body)}`);
    }
    return (body as { id: number }).id;
  }

  // Ensure correct org + role even if user was previously created without them
  await apiPut(saApi, `/admin/users/${existingId}`, {
    organizationId: orgId,
    roles:          [ROLE.MEMBER],
  });
  return existingId;
}

/** Creates testadmin if it does not already exist.  Returns the user id. */
export async function ensureTestAdmin(saApi: ApiContext, orgId: number): Promise<number> {
  const { body: raw } = await apiGet(saApi, '/admin/users');
  const users = extractList(raw) as Array<{ id: number; username: string; organizationId?: number }>;
  const existing = users.find((u) => u.username === 'testadmin');
  const existingId = existing?.id;

  if (!existingId) {
    const { status, body } = await apiPost(saApi, '/admin/users', {
      username:       'testadmin',
      password:       'testadmin123',
      email:          'testadmin@e2e.test',
      roles:          [ROLE.ADMIN],
      organizationId: orgId,
    });
    if (status !== 200 && status !== 201) {
      throw new Error(`Could not create testadmin: ${status} ${JSON.stringify(body)}`);
    }
    return (body as { id: number }).id;
  }

  // Ensure correct org + role even if user was previously created without them
  await apiPut(saApi, `/admin/users/${existingId}`, {
    organizationId: orgId,
    roles:          [ROLE.ADMIN],
  });
  return existingId;
}

/** Creates a member record via API.  Returns the created member. */
export async function createTestMember(
  api: ApiContext,
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; firstName: string; lastName: string }> {
  const ts = Date.now();
  const { status, body } = await apiPost(api, '/persons', {
    firstName: overrides.firstName ?? `E2E`,
    lastName:  overrides.lastName  ?? `Member${ts}`,
    email:     overrides.email     ?? `e2e-member-${ts}@test.invalid`,
    status:    overrides.status    ?? 'ACTIVE',
    gender:    overrides.gender    ?? 'MALE',
    ...overrides,
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`Could not create test member: ${status} ${JSON.stringify(body)}`);
  }
  return body as { id: number; firstName: string; lastName: string };
}

/** Deletes a member by id (best-effort, ignores 404). */
export async function deleteTestMember(api: ApiContext, id: number): Promise<void> {
  await apiDelete(api, `/persons/${id}`);
}

/** Creates a user account via API.  Returns the created user. */
export async function createTestUser(
  api: ApiContext,
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; username: string }> {
  const ts = Date.now();
  const username = (overrides.username as string) ?? `e2euser${ts}`;
  const { status, body } = await apiPost(api, '/admin/users', {
    username,
    password: overrides.password ?? 'E2ePass123!',
    email:    overrides.email    ?? `${username}@test.invalid`,
    roles:  overrides.roles  ?? [ROLE.MEMBER],
    ...overrides,
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`Could not create test user: ${status} ${JSON.stringify(body)}`);
  }
  return body as { id: number; username: string };
}

/** Deletes a user by id (best-effort). */
export async function deleteTestUser(api: ApiContext, id: number): Promise<void> {
  await apiDelete(api, `/admin/users/${id}`);
}

/** Creates a contribution type via API. */
export async function createTestContributionType(
  api: ApiContext,
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; code: string }> {
  const ts = Date.now();
  const { status, body } = await apiPost(api, '/contributions/types', {
    code:       overrides.code      ?? `E2ETYPE${ts}`,
    isRequired: overrides.isRequired ?? false,
    isActive:   overrides.isActive  ?? true,
    translations: [
      { locale: 'en', name: (overrides.nameEn as string) ?? `E2E Type ${ts}`, description: '' },
    ],
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`Could not create contribution type: ${status} ${JSON.stringify(body)}`);
  }
  return body as { id: number; code: string };
}

/** Deactivates a contribution type by id (soft-delete, best-effort). */
export async function deactivateTestContributionType(api: ApiContext, id: number): Promise<void> {
  await apiDelete(api, `/contributions/types/${id}`);
}

/** Deletes a contribution type by id (best-effort). */
export async function deleteTestContributionType(api: ApiContext, id: number): Promise<void> {
  await apiDelete(api, `/contributions/types/${id}`);
}
