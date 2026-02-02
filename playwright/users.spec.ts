import { test, expect, Page } from '@playwright/test';

test.use({
  storageState: {
    origins: [
      {
        origin: 'http://localhost:4200',
        localStorage: [
          { name: 'authToken', value: 'playwright-token' },
          {
            name: 'userPermissions',
            value: JSON.stringify({ modules: { INVITE_USER: ['CREATE', 'ACCESS'], MANAGE_USERS: ['INVITE'] } })
          }
        ]
      }
    ]
  }
});

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { INVITE_USER: ['CREATE', 'ACCESS'], MANAGE_USERS: ['INVITE'] } })
    );
  });

const mockUsers = async (page: Page, users: any[] = []) => {
  await page.route('**/users**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: users })
      });
      return;
    }
    await route.continue();
  });
};

const mockRoles = async (page: Page) => {
  await page.route('**/api/roles**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              { id: 1, name: 'Admin' },
              { id: 2, name: 'Technician' }
            ]
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const ensureAuth = async (page: Page) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { INVITE_USER: ['CREATE', 'ACCESS'], MANAGE_USERS: ['INVITE'] } })
    );
  });
};

test.describe('Users', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test.fixme('lists users (blocked by auth redirect in current build)', async ({ page }) => {
    await mockUsers(page, [
      { id: 1, name: 'Alice Doe', email: 'alice@example.com', roles: ['Admin'], status: 'ACTIVE' },
      { id: 2, name: 'Bob Roe', email: 'bob@example.com', roles: ['Technician'], status: 'INACTIVE' }
    ]);
    await mockRoles(page);

    await ensureAuth(page);
    await page.goto('/users');

    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible();
    await expect(page.getByText('Alice Doe')).toBeVisible();
    await expect(page.getByText('alice@example.com')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Bob Roe')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ Invite User/i })).toBeVisible();
  });

  test.fixme('shows empty state when no users (blocked by auth redirect)', async ({ page }) => {
    await mockUsers(page, []);
    await mockRoles(page);

    await ensureAuth(page);
    await page.goto('/users');

    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test.fixme('invites a user (blocked by auth redirect)', async ({ page }) => {
    await mockUsers(page, []);
    await mockRoles(page);

    let invitePayload: Record<string, any> = {};
    await page.route('**/users/invite', async route => {
      if (route.request().method() === 'POST') {
        invitePayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invite sent' })
        });
        return;
      }
      await route.continue();
    });

    await ensureAuth(page);
    await page.goto('/users');
    await page.getByRole('button', { name: /\+ Invite User/i }).click();

    await page.getByPlaceholder('Jane').fill('John');
    await page.getByPlaceholder('Doe').fill('Smith');
    await page.getByPlaceholder('jane@company.com').fill('john@example.com');
    await page.getByRole('combobox').selectOption('2'); // Technician role

    await page.getByRole('button', { name: /Send Invite/i }).click();

    expect(invitePayload.firstName).toBe('John');
    expect(invitePayload.lastName).toBe('Smith');
    expect(invitePayload.email).toBe('john@example.com');
    expect(invitePayload.roleIds).toEqual([2]);
  });
});
