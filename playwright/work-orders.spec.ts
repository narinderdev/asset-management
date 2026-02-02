import { test, expect, Page, Request } from '@playwright/test';

const PERMISSIONS = {
  modules: {
    WORK_ORDER: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'],
    ASSET: ['VIEW'],
  },
};

const seedAuth = async (page: Page) => {
  // Don't navigate here. Just ensure localStorage is set for every document load.
  await page.addInitScript(
    ({ token, permissions }) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    },
    { token: 'playwright-token', permissions: PERMISSIONS }
  );
};

const mockWorkOrdersList = async (page: Page) => {
  await page.route('**/api/work-orders**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    // Let the dedicated /api/work-orders/:id routes handle those.
    // This prevents the generic list mock from catching /api/work-orders/555.
    const isDetail = /^\/api\/work-orders\/\d+/.test(pathname);
    if (isDetail) return route.continue();

    // You can also guard by method if you want only GET list calls mocked:
    // if (req.method() !== 'GET') return route.continue();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          workOrders: [
            {
              id: 100,
              workOrderId: 'WO-100',
              woTitle: 'Fix Pump',
              assetName: 'Pump A',
              assignedTechnicianName: 'Alex',
              priority: 'HIGH',
              status: 'NEW',
              plannedEndDateTime: '2026-02-01T00:00:00Z',
            },
            {
              id: 101,
              workOrderId: 'WO-101',
              woTitle: 'Inspect Conveyor',
              assetName: 'Conveyor B',
              assignedTechnicianName: 'Jamie',
              priority: 'MEDIUM',
              status: 'IN_PROGRESS',
              plannedEndDateTime: '2026-02-05T00:00:00Z',
            },
          ],
          totalElements: 2,
          page: 0,
          size: 10,
        },
      }),
    });
  });
};

const mockAssets = async (page: Page) => {
  await page.route('**/api/assets**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            { id: 1, assetId: 'AST-1', assetName: 'Pump A' },
            { id: 2, assetId: 'AST-2', assetName: 'Conveyor B' },
          ],
        },
      }),
    });
  });
};

const mockWorkOrderTypes = async (page: Page) => {
  await page.route('**/api/work-order-types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            {
              id: 10,
              workOrderType: 'MAINTENANCE',
              defaultGlAccount: '10100',
              defaultUtilityAccount: 'UTIL-01',
            },
          ],
          totalElements: 1,
          page: 0,
          size: 10,
        },
      }),
    });
  });
};

test.describe('Work Orders', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists work orders with normalized fields', async ({ page }) => {
    await mockWorkOrdersList(page);

    await page.goto('/work-orders');

    await expect(page.getByText('Work Order Management')).toBeVisible();
    await expect(page.getByText('WO-100')).toBeVisible();
    await expect(page.getByText('Fix Pump')).toBeVisible();
    await expect(page.getByText('Pump A')).toBeVisible();
    await expect(page.getByText('Alex')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByText('New')).toBeVisible();

    await expect(page.getByText('WO-101')).toBeVisible();
    await expect(page.getByText('Inspect Conveyor')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
  });

  test('creates a work order', async ({ page }) => {
    await mockAssets(page);
    await mockWorkOrderTypes(page);
    // IMPORTANT: once created, app navigates to /work-orders and loads listing
    await mockWorkOrdersList(page);

    let postPayload: Record<string, unknown> = {};
    await page.route('**/api/work-orders', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 999, workOrderId: 'WO-999' } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/work-orders/create');

    await page.locator('select[name="assetId"]').selectOption({ label: 'Pump A' });
    await page.locator('input[name="location"]').fill('Bay 1');
    await page.locator('select[name="workType"]').selectOption('CORRECTIVE');
    await page.locator('select[name="priority"]').selectOption('HIGH');
    await page.locator('input[name="woTitle"]').fill('Seal leak');
    await page
      .locator('textarea[name="descriptionScope"], input[name="descriptionScope"]')
      .fill('Replace mechanical seal');
    await page.locator('input[name="targetCompletionDate"]').fill('2026-02-15');

    await page.getByRole('button', { name: /Create Work Order/i }).click();

    expect(postPayload.assetId).toBe(1);
    expect(postPayload.workType).toBe('CORRECTIVE');
    expect(postPayload.priority).toBe('HIGH');
    expect(postPayload.woTitle).toBe('Seal leak');
    expect(postPayload.descriptionScope).toBe('Replace mechanical seal');
    expect(postPayload.targetCompletionDate).toBe('2026-02-15');

    await expect(page).toHaveURL(/\/work-orders$/);
  });

  test('edits a work order', async ({ page }) => {
    await mockAssets(page);
    await mockWorkOrderTypes(page);
    // IMPORTANT: after PATCH, app navigates to /work-orders and loads listing
    await mockWorkOrdersList(page);

    await page.route('**/api/work-orders/555', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 555,
              workOrderId: 'WO-555',
              assetDbId: 2,
              location: 'Bay 3',
              workType: 'PREVENTIVE',
              priority: 'MEDIUM',
              woTitle: 'Lubricate bearings',
              descriptionScope: 'Lube all bearings',
              targetCompletionDate: '2026-02-20',
            },
          }),
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 555 } }),
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: Record<string, unknown> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/work-orders/555')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/work-orders/edit/555');

    await page.locator('input[name="woTitle"]').fill('Lubricate bearings updated');
    await page.getByRole('button', { name: /Update Work Order/i }).click();

    expect(patchPayload.woTitle).toBe('Lubricate bearings updated');
    expect(patchPayload.workType).toBe('PREVENTIVE');

    await expect(page).toHaveURL(/\/work-orders$/);
  });

  test('deletes a work order from listing', async ({ page }) => {
    await mockWorkOrdersList(page);

    let deleteCalled = false;
    await page.route('**/api/work-orders/100', async (route) => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/work-orders');
    await page.waitForTimeout(200);

    await page.getByLabel('Delete work order').first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
