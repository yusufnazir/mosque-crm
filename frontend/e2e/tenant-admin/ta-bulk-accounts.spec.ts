import { test, expect, type Page } from '@playwright/test';
import type { CurrentUser } from '../../lib/auth/AuthContext';
import type { MemberAccountResult } from '../../lib/api';

const preview: MemberAccountResult[] = [
  { personId: 1, name: 'Email Member', username: 'email@example.test', status: 'ELIGIBLE_EMAIL' },
  { personId: 2, name: 'Phone Member', username: '+5978123456', status: 'ELIGIBLE_WHATSAPP' },
  { personId: 3, name: 'Existing Member', username: 'existing@example.test', status: 'ALREADY_HAS_ACCOUNT' },
  { personId: 4, name: 'Inactive Member', username: 'inactive@example.test', status: 'INACTIVE' },
];

async function mockMembers(page: Page, options: { platform?: boolean; noOrganization?: boolean; ordinary?: boolean } = {}) {
  const currentUser: CurrentUser = {
    id: 100, username: 'mock-admin', roles: [options.ordinary ? 'MEMBER' : options.platform ? 'SUPER_ADMIN' : 'ADMIN'],
    superAdmin: !!options.platform,
    organizationId: options.platform ? undefined : 7, organizationName: 'Test Organization',
    permissions: ['member.view', 'member_account.view', 'member_account.manage'],
    ...(options.platform && !options.noOrganization
      ? { selectedOrganizationId: 7, selectedOrganizationName: 'Test Organization' } : {}),
    preferences: { language: 'en' },
  };
  await page.context().addCookies([{ name: 'session_token', value: 'mock-session',
    domain: 'admin.lvh.me', path: '/' }]);
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/me' || path === '/api/auth/me') return route.fulfill({ json: currentUser });
    if (path === '/api/me/preferences') return route.fulfill({ json: { language: 'en', preferredLanguage: 'en' } });
    if (path === '/api/subscription/current') return route.fulfill({
      json: { id: 1, organizationId: 7, status: 'ACTIVE', entitlements: [], planName: 'Test', billingEnabled: false },
    });
    if (path === '/api/persons/page') return route.fulfill({
      json: { content: [{ id: '1', firstName: 'Email', lastName: 'Member', status: 'ACTIVE' }],
        page: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    return route.fulfill({ json: [] });
  });
}

test('tenant admin can confirm selected members without creating unselected accounts', async ({ page }) => {
  await mockMembers(page);
  const requests: number[][] = [];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: preview }));
  await page.route('**/api/admin/members/accounts', route => {
    requests.push(route.request().postDataJSON().personIds);
    return route.fulfill({ json: [{ ...preview[0], status: 'CREATED_EMAIL' }] });
  });
  await page.goto('/members');
  await expect(page.locator('[data-testid="sidebar-nav"] a[href="/member-accounts"]')).toBeVisible();
  await page.getByRole('link', { name: 'Create member accounts', exact: true }).click();
  await expect(page).toHaveURL(/\/member-accounts$/);
  await expect(page.getByRole('checkbox', { name: 'Select Existing Member', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Select Inactive Member', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Select Email Member', exact: true }).check();
  await page.getByRole('button', { name: 'Create selected (1)', exact: true }).click();
  let confirmation = page.getByRole('dialog').filter({ hasText: 'Create accounts and send activation links?' }).last();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Create selected (1)', exact: true }).click();
  confirmation = page.getByRole('dialog').filter({ hasText: 'Create accounts and send activation links?' }).last();
  await confirmation.getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Created - email accepted', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Select Phone Member', exact: true })).toBeEnabled();
  expect(requests).toEqual([[1]]);
});

test('platform admin creates all eligible accounts sequentially in the selected organization', async ({ page }) => {
  await mockMembers(page, { platform: true });
  const requests: number[][] = [];
  let active = 0;
  let maxActive = 0;
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: preview }));
  await page.route('**/api/admin/members/accounts', async route => {
    expect(route.request().headers()['x-organization-id']).toBe('7');
    const ids: number[] = route.request().postDataJSON().personIds;
    requests.push(ids);
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 100));
    active--;
    await route.fulfill({ json: [{ ...preview[ids[0] - 1],
      status: ids[0] === 1 ? 'CREATED_EMAIL' : 'CREATED_NO_NOTIFICATION' }] });
  });
  await page.goto('/member-accounts');
  await expect(page.locator('[data-testid="sidebar-nav"] a[href="/member-accounts"]')).toBeVisible();
  await page.getByRole('button', { name: 'Create all eligible (2)', exact: true }).click();
  await page.getByRole('dialog').filter({ hasText: 'Create accounts and send activation links?' }).last()
    .getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByText('Processed 2 of 2 members.', { exact: true })).toBeVisible();
  await expect(page.getByText('Created: 2. Email accepted: 1. WhatsApp queued: 0. Notification failed: 1. Skipped/failed accounts: 0.'))
    .toBeVisible();
  expect(requests).toEqual([[1], [2]]);
  expect(maxActive).toBe(1);
});

test('platform admin must choose an organization and ordinary members do not see bulk creation', async ({ page }) => {
  await mockMembers(page, { platform: true, noOrganization: true });
  const candidateRequests: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/admin/members/accounts/candidates')) candidateRequests.push(request.url());
  });
  await page.goto('/member-accounts');
  await expect(page.getByRole('heading', { name: 'Create member accounts', exact: true })).toBeVisible();
  await expect(page.getByText('Select an organization first.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create all eligible/ })).toHaveCount(0);
  await page.unroute('**/api/**');
  await mockMembers(page, { ordinary: true });
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: /access denied/i })).toBeVisible();
  await expect(page.locator('[data-testid="sidebar-nav"] a[href="/member-accounts"]')).toHaveCount(0);
  expect(candidateRequests).toEqual([]);
});

test('interrupted processing preserves completed accounts and refreshes eligibility before retry', async ({ page }) => {
  await mockMembers(page);
  let firstCreated = false;
  const requests: number[][] = [];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({
    json: preview.map(member => firstCreated && member.personId === 1
      ? { ...member, status: 'ALREADY_HAS_ACCOUNT' } : member),
  }));
  await page.route('**/api/admin/members/accounts', route => {
    const ids = route.request().postDataJSON().personIds;
    requests.push(ids);
    if (ids[0] === 2) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    firstCreated = true;
    return route.fulfill({ json: [{ ...preview[0], status: 'CREATED_EMAIL' }] });
  });
  await page.goto('/member-accounts');
  await page.getByRole('button', { name: 'Create all eligible (2)', exact: true }).click();
  await page.getByRole('dialog').filter({ hasText: 'Create accounts and send activation links?' }).last()
    .getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByText(/Processing stopped\. Completed accounts are kept/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create all eligible (1)', exact: true })).toBeEnabled();
  await expect(page.getByRole('checkbox', { name: 'Select Email Member', exact: true })).toBeDisabled();
  expect(requests).toEqual([[1], [2]]);
});

test('member account selection survives pagination and all eligible includes hidden pages', async ({ page }) => {
  await mockMembers(page);
  const members: MemberAccountResult[] = Array.from({ length: 75 }, (_, index) => ({
    personId: index + 1, name: `Member ${index + 1}`,
    username: `member${index + 1}@example.test`, status: 'ELIGIBLE_EMAIL',
  }));
  const requests: number[][] = [];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: members }));
  await page.route('**/api/admin/members/accounts', route => {
    const ids: number[] = route.request().postDataJSON().personIds;
    requests.push(ids);
    return route.fulfill({ json: ids.map(id => ({ ...members[id - 1], status: 'CREATED_EMAIL' })) });
  });
  await page.goto('/member-accounts');
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await expect(page.getByRole('button', { name: 'Create all eligible (75)', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Select Member 1', exact: true }).check();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(25);
  await page.getByRole('checkbox', { name: 'Select Member 51', exact: true }).check();
  await page.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Select Member 1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Create selected (2)', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByText('Processed 2 of 2 members.', { exact: true })).toBeVisible();
  expect(requests).toEqual([[1], [51]]);
});

async function filterStatuses(page: Page, labels: string[]) {
  const filters = page.getByRole('group', { name: 'Filter by status', exact: true });
  if (!await filters.isVisible()) {
    await page.getByRole('button', { name: 'Filter by status', exact: true }).click();
  }
  await filters.getByRole('button', { name: 'All statuses', exact: true }).click();
  for (const label of labels) {
    await filters.getByRole('checkbox', { name: label, exact: true }).check();
  }
  await page.getByRole('button', { name: 'Filter by status', exact: true }).click();
}

test('status and search filters restrict bulk creation and show updated results', async ({ page }) => {
  await mockMembers(page);
  const members: MemberAccountResult[] = [...preview,
    { personId: 5, name: 'Other Email', username: 'other@example.test', status: 'ELIGIBLE_EMAIL' },
  ];
  const requests: number[][] = [];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: members }));
  await page.route('**/api/admin/members/accounts', route => {
    const ids: number[] = route.request().postDataJSON().personIds;
    requests.push(ids);
    return route.fulfill({ json: ids.map(id => ({
      ...members.find(member => member.personId === id), status: 'CREATED_EMAIL',
    })) });
  });
  await page.goto('/member-accounts');
  const search = page.getByRole('textbox', { name: 'Search members...', exact: true });
  await filterStatuses(page, ['Already has an account']);
  await expect(page.getByRole('cell', { name: 'Existing Member', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Create all eligible (0)', exact: true })).toBeDisabled();
  await filterStatuses(page, ['Not active or deceased']);
  await expect(page.getByRole('cell', { name: 'Inactive Member', exact: true })).toBeVisible();
  await filterStatuses(page, ['Eligible - WhatsApp']);
  await expect(page.getByRole('cell', { name: 'Phone Member', exact: true })).toBeVisible();
  await search.fill('Email');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create all eligible (0)', exact: true })).toBeDisabled();
  await filterStatuses(page, ['Eligible - email']);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await search.fill('email@example.test');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create all eligible (1)', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByText('Processed 1 of 1 members.', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create all eligible (0)', exact: true })).toBeDisabled();
  await filterStatuses(page, ['Created - email accepted']);
  await expect(page.getByRole('cell', { name: 'Created - email accepted', exact: true })).toBeVisible();
  expect(requests).toEqual([[1]]);
});

test('changing status resets pagination without losing selections or excluding hidden matching pages', async ({ page }) => {
  await mockMembers(page);
  const members: MemberAccountResult[] = [
    ...Array.from({ length: 75 }, (_, index): MemberAccountResult => ({
      personId: index + 1, name: `Member ${index + 1}`,
      username: `member${index + 1}@example.test`, status: 'ELIGIBLE_EMAIL',
    })),
    { personId: 76, name: 'Phone Member', username: '+5978123456', status: 'ELIGIBLE_WHATSAPP' },
  ];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: members }));
  await page.goto('/member-accounts');
  await page.getByRole('checkbox', { name: 'Select Member 1', exact: true }).check();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(26);
  await filterStatuses(page, ['Eligible - WhatsApp']);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'Phone Member', exact: true })).toBeVisible();
  await filterStatuses(page, ['Eligible - email']);
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await expect(page.getByRole('checkbox', { name: 'Select Member 1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Create all eligible (75)', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Create 75 MEMBER accounts');
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await filterStatuses(page, []);
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await expect(page.getByRole('checkbox', { name: 'Select Member 1', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Create all eligible (76)', exact: true })).toBeEnabled();
});

test('multiple statuses match any selection and bulk creation excludes ineligible members', async ({ page }) => {
  await mockMembers(page);
  const requests: number[][] = [];
  await page.route('**/api/admin/members/accounts/candidates', route => route.fulfill({ json: preview }));
  await page.route('**/api/admin/members/accounts', route => {
    const ids: number[] = route.request().postDataJSON().personIds;
    requests.push(ids);
    return route.fulfill({ json: ids.map(id => ({
      ...preview[id - 1], status: id === 1 ? 'CREATED_EMAIL' : 'CREATED_WHATSAPP',
    })) });
  });
  await page.goto('/member-accounts');
  await filterStatuses(page, ['Eligible - email', 'Eligible - WhatsApp', 'Already has an account']);
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('checkbox', { name: 'Select Existing Member', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Create all eligible (2)', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Filter by status', exact: true }).click();
  const filters = page.getByRole('group', { name: 'Filter by status', exact: true });
  await filters.getByRole('checkbox', { name: 'Eligible - email', exact: true }).uncheck();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Create all eligible (1)', exact: true })).toBeEnabled();
  await filters.getByRole('checkbox', { name: 'Eligible - email', exact: true }).check();
  await page.getByRole('button', { name: 'Filter by status', exact: true }).click();
  await page.getByRole('button', { name: 'Create all eligible (2)', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create accounts', exact: true }).click();
  await expect(page.getByText('Processed 2 of 2 members.', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(requests).toEqual([[1], [2]]);
  await filterStatuses(page, []);
  await expect(page.locator('tbody tr')).toHaveCount(4);
});
