import { test, expect } from '@playwright/test';
import { ADMIN_USER, loginAs, TENANT_ADMIN_USER } from '../helpers/auth';

const stats = {
  queued: 1, sending: 0, sent: 20, failed: 0, cancelled: 0, optOuts: 0,
  sessionStatus: 'WORKING', sessionName: 'test', sentLastHour: 0, sentToday: 0,
  hourlyCap: 20, dailyCap: 100, effectiveDailyCap: 100, warmupDay: 1,
  quietHours: false, quietHoursStart: 20, quietHoursEndHour: 20, timezone: 'UTC',
  coldDelayMinSeconds: 15, coldDelayMaxSeconds: 45,
  conversationDelayMinSeconds: 5, conversationDelayMaxSeconds: 15,
  typingSimulationEnabled: false, recentReplies: [],
};

const message = (id: number, status: 'QUEUED' | 'SENDING' | 'SENT') => ({
  id, status, recipientPhone: '+5971234567', recipientName: `Recipient ${id}`,
  body: `Message ${id}`, profile: 'COLD', attemptCount: 0,
  createdAt: '2026-01-01T12:00:00',
});

test('deleting the last message on a page returns to the preceding page', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  let deleted = false;
  await page.route('**/api/whatsapp/stats', (route) => route.fulfill({ json: stats }));
  await page.route('**/api/whatsapp/messages?*', (route) => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'));
    const content = pageNumber === 0
      ? Array.from({ length: 20 }, (_, index) => message(index + 1, 'SENT'))
      : deleted ? [] : [message(42, 'QUEUED')];
    return route.fulfill({
      json: { content, totalElements: deleted ? 20 : 21, totalPages: deleted ? 1 : 2, number: pageNumber, size: 20 },
    });
  });
  await page.route('**/api/whatsapp/messages/42', (route) => {
    expect(route.request().method()).toBe('DELETE');
    deleted = true;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/whatsapp');
  await page.getByRole('button', { name: 'Queue', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Recipient 42' });
  await row.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('cancels the queued message');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Message deleted.')).toBeVisible();
  await expect(page.getByText('Recipient 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Recipient 42', { exact: true })).toHaveCount(0);
});

test('a message claimed while the dialog is open cannot be deleted', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  let sending = false;
  await page.route('**/api/whatsapp/stats', (route) => route.fulfill({ json: stats }));
  await page.route('**/api/whatsapp/messages?*', (route) => route.fulfill({
    json: {
      content: [message(42, sending ? 'SENDING' : 'QUEUED')],
      totalElements: 1, totalPages: 1, number: 0, size: 20,
    },
  }));
  await page.route('**/api/whatsapp/messages/42', (route) => {
    sending = true;
    return route.fulfill({ status: 409, json: { code: 'MESSAGE_SENDING', error: 'Already sending' } });
  });

  await page.goto('/whatsapp');
  await page.getByRole('button', { name: 'Queue', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'Recipient 42' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('This message is being sent. Try again when it finishes.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Recipient 42' }).getByRole('button', { name: 'Delete' })).toBeDisabled();
});

test('only platform admins see and access WhatsApp and schedulers', async ({ page }) => {
  await loginAs(page, TENANT_ADMIN_USER.username, TENANT_ADMIN_USER.password);
  const nav = page.locator('[data-testid="sidebar-nav"]');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a[href="/whatsapp"]')).toHaveCount(0);
  await expect(nav.locator('a[href="/schedulers"]')).toHaveCount(0);

  const protectedRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(whatsapp|schedulers)(?:\/|\?|$)/.test(request.url())) {
      protectedRequests.push(request.url());
    }
  });
  for (const route of ['/whatsapp', '/schedulers']) {
    await page.goto(route);
    await expect(page.getByRole('alert')).toContainText(/access denied|toegang geweigerd/i);
  }
  expect(protectedRequests).toEqual([]);
});

test('platform admins see WhatsApp and schedulers', async ({ page }) => {
  await loginAs(page, ADMIN_USER.username, ADMIN_USER.password);
  const nav = page.locator('[data-testid="sidebar-nav"]');
  await expect(nav.locator('a[href="/whatsapp"]')).toBeVisible();
  await expect(nav.locator('a[href="/schedulers"]')).toBeVisible();
});
