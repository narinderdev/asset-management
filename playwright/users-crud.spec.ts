import { test, expect, Page } from '@playwright/test';

const seedAuth = (page: Page, perms: Record<string, string[]>) =>
  page.addInitScript((p) => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: p }));
  }, perms);

async function mockUserApis(page: Page) {
  const users = [
    { id: 1, firstName: 'Alice', lastName: 'Doe', email: 'alice@example.com', roles: [{ id: 1, name: 'Admin' }], status: 'ACTIVE' }
  ];

  await page.route('**/api/roles**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        json: { data: { content: [{ id: 1, name: 'Admin' }, { id: 2, name: 'Technician' }] } }
      });
    }
    return route.fallback();
  });

  await page.route('**/api/users/invite**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      users.push({
        id: users.length + 1,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        roles: [{ id: body.roleIds?.[0], name: body.roleIds?.[0] === 1 ? 'Admin' : 'Technician' }],
        status: 'PENDING'
      });
      return route.fulfill({ status: 200, json: { message: 'Invite sent' } });
    }
    return route.fallback();
  });

  await page.route('**/api/users**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: { data: users } });
    }
    return route.fallback();
  });
}

test.describe.skip('Users CRUD (invite/list with mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, { INVITE_USER: ['CREATE', 'ACCESS'], MANAGE_USERS: ['INVITE'], ROLES: ['VIEW'] });
    await mockUserApis(page);
  });

  test('list users and invite new user', async ({ page }) => {
    await page.goto('/users');

    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible();
    await expect(page.getByText('Alice Doe')).toBeVisible();
    await expect(page.getByText('alice@example.com')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();

    await page.getByRole('button', { name: /\+ Invite User/i }).click();
    await page.getByPlaceholder('Jane').fill('John');
    await page.getByPlaceholder('Doe').fill('Smith');
    await page.getByPlaceholder('jane@company.com').fill('john@example.com');
    await page.getByRole('combobox').selectOption('2'); // Technician
    await page.getByRole('button', { name: /Send Invite/i }).click();

    await expect(page.getByRole('heading', { name: /Invite User/i })).not.toBeVisible();
    await expect(page.getByText('john@example.com')).toBeVisible();
  });
});
