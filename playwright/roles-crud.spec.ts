import { test, expect, Page } from '@playwright/test';

const seedAuth = (page: Page, perms: Record<string, string[]>) =>
  page.addInitScript((p) => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: p }));
  }, perms);

async function mockRolesApis(page: Page) {
  const roles = [
    { id: 1, name: 'Admin', description: 'All access', active: true },
    { id: 2, name: 'Viewer', description: 'Read only', active: true }
  ];

  await page.route('**/api/permissions**', async route => {
    await route.fulfill({
      status: 200,
      json: {
        data: [
          {
            module: 'ASSET',
            permissions: [
              { action: 'VIEW', code: 'ASSET_VIEW' },
              { action: 'CREATE', code: 'ASSET_CREATE' },
              { action: 'UPDATE', code: 'ASSET_UPDATE' },
              { action: 'DELETE', code: 'ASSET_DELETE' }
            ]
          }
        ]
      }
    });
  });

  await page.route('**/api/roles**', async route => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({ status: 200, json: { data: { content: roles } } });
    }
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const newRole = {
        id: roles.length + 1,
        name: body.name,
        description: body.description,
        active: true
      };
      roles.push(newRole);
      return route.fulfill({ status: 201, json: { data: newRole } });
    }
    return route.fallback();
  });
}

test.describe('Roles CRUD (UI + mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, { ROLES: ['VIEW', 'CREATE'] });
    await mockRolesApis(page);
  });

  test('list and create role', async ({ page }) => {
    await page.goto('/roles-permissions');

    await expect(page.getByRole('heading', { name: /Roles/i })).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('Viewer')).toBeVisible();

    // Create
    await page.getByRole('button', { name: '+ Add Role' }).click();
    await page.getByLabel('Name').fill('Playwright Role');
    await page.getByLabel('Description').fill('Created by Playwright');
    // select one permission
    await page.getByRole('checkbox', { name: 'Assign all' }).check();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Add Role' })).not.toBeVisible();
    await expect(page.getByText('Playwright Role')).toBeVisible();
    await expect(page.getByText('Created by Playwright')).toBeVisible();
  });

  test.fixme('edit role (UI currently lacks edit controls)', async () => {});
  test.fixme('delete role (UI currently lacks delete controls)', async () => {});
});
