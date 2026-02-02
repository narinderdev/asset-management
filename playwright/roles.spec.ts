import { test, expect, Page } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
  });

const mockPermissions = async (page: Page) => {
  await page.route('**/api/permissions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            module: 'ASSET',
            permissions: [
              { action: 'VIEW', code: 'ASSET_VIEW' },
              { action: 'CREATE', code: 'ASSET_CREATE' },
              { action: 'UPDATE', code: 'ASSET_UPDATE' },
              { action: 'DELETE', code: 'ASSET_DELETE' }
            ]
          },
          {
            module: 'WORK_ORDER',
            permissions: [
              { action: 'VIEW', code: 'WO_VIEW' },
              { action: 'CREATE', code: 'WO_CREATE' }
            ]
          }
        ]
      })
    });
  });
};

const mockRolesList = async (page: Page, roles: any[] = []) => {
  await page.route('**/api/roles**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { content: roles } })
      });
      return;
    }
    await route.continue();
  });
};

test.describe('Roles', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists roles', async ({ page }) => {
    await mockPermissions(page);
    await mockRolesList(page, [
      { id: 1, name: 'Admin', description: 'All access', active: true },
      { id: 2, name: 'Viewer', description: 'Read only', active: false }
    ]);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'playwright-token');
      localStorage.setItem('userPermissions', JSON.stringify({ modules: { ROLES: ['VIEW', 'CREATE'] } }));
    });
    await page.goto('/roles-permissions');

    await expect(page.getByRole('heading', { name: /Roles/i })).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('All access')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Active', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Viewer')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('shows empty state when no roles', async ({ page }) => {
    await mockPermissions(page);
    await mockRolesList(page, []);

    await page.goto('/roles-permissions');

    await expect(page.getByText('No roles to display.')).toBeVisible();
  });

  test.fixme('creates a role with permissions (blocked by auth redirect in current build)', async () => {
    // TODO: Once a stable test login utility is available for roles-permissions route,
    // re-enable this test. Current app redirects to /login even with seeded authToken.
  });
});
