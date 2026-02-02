import { test, expect } from '@playwright/test';

const seedAuth = async (page: any) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { ROLES: ['VIEW'], INVITE_USER: ['CREATE'] } }));
  });
};

const silenceApis = async (page: any) => {
  await page.route('**/api/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    if (route.request().method() === 'POST' && route.request().url().includes('/logout')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'logged out' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
};

test.describe('Logout', () => {
  test('logs out via sidebar modal', async ({ page }) => {
    await seedAuth(page);
    await silenceApis(page);

    await page.goto('/dashboard');

    // open logout modal
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page.getByText('Are you sure you want to logout?')).toBeVisible();

    // confirm
    await Promise.all([
      page.waitForURL(/\/login/),
      page.getByRole('button', { name: 'Yes' }).click()
    ]);

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeNull();
  });
});
