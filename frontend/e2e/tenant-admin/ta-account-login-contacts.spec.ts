import { test, expect, type Page } from '@playwright/test';
import type { CurrentUser } from '../../lib/auth/AuthContext';
import type { UserDTO } from '../../lib/userApi';

async function mockAccount(page: Page) {
  const current: CurrentUser = {
    id: 7, username: 'admin', roles: ['ADMIN'], superAdmin: false,
    organizationId: 7, organizationName: 'Test Organization',
    permissions: ['user.view', 'user.manage'], preferences: { language: 'en' },
  };
  await page.context().addCookies([{ name: 'session_token', value: 'mock-session',
    domain: 'admin.lvh.me', path: '/' }]);
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/me' || path === '/api/auth/me') return route.fulfill({ json: current });
    if (path === '/api/me/preferences') return route.fulfill({
      json: { language: 'en', preferredLanguage: null },
    });
    if (path === '/api/subscription/current') return route.fulfill({
      json: { id: 1, organizationId: 7, status: 'ACTIVE', entitlements: [], planName: 'Test', billingEnabled: false },
    });
    if (path === '/api/admin/roles/assignable') return route.fulfill({
      json: [{ id: 1, name: 'ADMIN', description: 'Admin', permissionCodes: [] }],
    });
    return route.fulfill({ json: [] });
  });
}

test('an admin without a member profile can save and clear their account phone', async ({ page }) => {
  await mockAccount(page);
  let account = { id: 7, username: 'admin', role: 'ADMIN', email: 'admin@example.test', phone: '' };
  const requests: { email: string; phone: string }[] = [];
  await page.route('**/api/users/me', route => route.fulfill({ json: account }));
  await page.route('**/api/users/me/contacts', route => {
    const contacts = route.request().postDataJSON();
    requests.push(contacts);
    account = { ...account, ...contacts };
    return route.fulfill({ json: { message: 'Updated' } });
  });
  await page.goto('/account');
  await page.getByLabel('Email Address', { exact: true }).fill('alias@example.test');
  await page.getByLabel('Phone', { exact: true }).fill('+597 8123456');
  await page.getByRole('button', { name: 'Save login contacts', exact: true }).click();
  await expect(page.getByText('Login contacts updated successfully.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save login contacts', exact: true })).toBeDisabled();
  expect(requests).toEqual([{ email: 'alias@example.test', phone: '+5978123456' }]);
  expect(account.username).toBe('admin');
  await page.getByLabel('Phone', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save login contacts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save login contacts', exact: true })).toBeDisabled();
  expect(requests[1]).toEqual({ email: 'alias@example.test', phone: '' });
});

test('account contact conflicts show an error instead of reporting success', async ({ page }) => {
  await mockAccount(page);
  await page.route('**/api/users/me', route => route.fulfill({
    json: { id: 7, username: 'admin', role: 'ADMIN', email: 'admin@example.test', phone: null },
  }));
  await page.route('**/api/users/me/contacts', route => route.fulfill({
    status: 400, json: { message: 'Contact belongs to another account' },
  }));
  await page.goto('/account');
  await page.getByLabel('Phone', { exact: true }).fill('+5978123456');
  await page.getByRole('button', { name: 'Save login contacts', exact: true }).click();
  await expect(page.getByText('Contact belongs to another account', { exact: true })).toBeVisible();
  await expect(page.getByText('Login contacts updated successfully.', { exact: true })).toHaveCount(0);
});

test('user management edits and searches an independent account phone', async ({ page }) => {
  await mockAccount(page);
  let account: UserDTO = {
    id: 8, username: 'another-admin', email: 'another@example.test', phone: null,
    accountEnabled: true, accountLocked: false, createdAt: '2026-01-01T00:00:00',
    lastLogin: null, organizationId: 7, organizationName: 'Test Organization',
    roles: ['ADMIN'], personId: null, personName: null, currentUser: false,
  };
  const phones: string[] = [];
  await page.route('**/api/admin/users', route => route.fulfill({ json: [account] }));
  await page.route('**/api/admin/users/8', route => {
    const payload = route.request().postDataJSON();
    phones.push(payload.phone);
    account = { ...account, ...payload };
    return route.fulfill({ json: account });
  });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Phone', { exact: true }).fill('+5978123456');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('User updated successfully', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search users...', { exact: true }).fill('8123456');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(phones).toEqual(['+5978123456']);
});
