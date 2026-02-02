import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({
      modules: {
        INVENTORY: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'],
        WAREHOUSE: ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
      }
    }));
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({
      modules: {
        INVENTORY: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'],
        WAREHOUSE: ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
      }
    }));
  });
};

const mockWarehouseList = async (page: Page) => {
  await page.route('**/api/warehouses**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, name: 'Main WH', address: '123 Ave', zoneAisle: 'A1', rackShelf: 'R1', binCode: 'B1', binDescription: 'Bin 1', active: true },
            { id: 2, name: 'Backup WH', address: '456 Rd', zoneAisle: 'B1', rackShelf: 'R2', binCode: 'B2', binDescription: 'Bin 2', active: false }
          ]
        })
      });
      return;
    }
    await route.continue();
  });
};

test.describe('Warehouses', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists warehouses', async ({ page }) => {
    await mockWarehouseList(page);

    await page.goto('/inventory/warehouse');
    await expect(page.getByRole('heading', { name: /Warehouse/i })).toBeVisible();
    await expect(page.getByText('Main WH')).toBeVisible();
    await expect(page.getByText('Backup WH')).toBeVisible();
    await expect(page.locator('.status-chip', { hasText: 'Active' }).first()).toBeVisible();
    await expect(page.locator('.status-chip', { hasText: 'Inactive' }).first()).toBeVisible();
  });

  test('creates a warehouse', async ({ page }) => {
    let postPayload: Record<string, unknown> = {};
    await page.route('**/api/warehouses', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 10 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/inventory/warehouse/create');
    await page.locator('input[name="name"]').fill('New WH');
    await page.locator('input[name="address"]').fill('789 Blvd');
    await page.locator('input[name="zoneAisle"]').fill('C1');
    await page.locator('input[name="rackShelf"]').fill('R3');
    await page.locator('input[name="binCode"]').fill('B3');
    await page.locator('input[name="binDescription"]').fill('Bin 3');
    const activeSelect = page.locator('select[name="active"]');
    await activeSelect.locator('option').first().waitFor({ state: 'attached' });
    await activeSelect.selectOption({ label: 'Active' });

    await page.getByRole('button', { name: /Create/ }).click();

    expect(postPayload.name).toBe('New WH');
    expect(postPayload.active).toBe(true);
    expect(postPayload.binCode).toBe('B3');
    await expect(page).toHaveURL(/\/inventory\/warehouse$/);
  });

  test('updates a warehouse', async ({ page }) => {
    await page.route('**/api/warehouses/55', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 55,
              name: 'Old WH',
              address: 'Addr',
              zoneAisle: 'Z1',
              rackShelf: 'R1',
              binCode: 'B1',
              binDescription: 'Desc',
              active: true
            }
          })
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 55 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: Record<string, unknown> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/warehouses/55')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/inventory/warehouse/create?id=55');
    await page.locator('input[name="name"]').fill('Updated WH');
    await page.getByRole('button', { name: /Update/ }).click();

    expect(patchPayload.name).toBe('Updated WH');
    await expect(page).toHaveURL(/\/inventory\/warehouse$/);
  });

  test('deletes a warehouse from listing', async ({ page }) => {
    await mockWarehouseList(page);
    let deleteCalled = false;
    await page.route('**/api/warehouses/1', async (route) => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/inventory/warehouse');
    await page.waitForTimeout(200);

    await page.getByLabel('Delete warehouse').first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
