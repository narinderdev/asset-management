import { test, expect, Page, Request } from '@playwright/test';

const PERMISSIONS = {
  modules: { WORK_ORDER: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] },
};

const seedAuth = async (page: Page) => {
  // Don't navigate here — it can trigger redirects and API calls before mocks are registered.
  await page.addInitScript(
    ({ token, permissions }) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    },
    { token: 'playwright-token', permissions: PERMISSIONS }
  );
};

const mockList = async (page: Page) => {
  await page.route('**/api/work-order-types**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    // Let detail endpoints (/api/work-order-types/:id) be handled by a dedicated mock (or continue).
    const isDetail = /^\/api\/work-order-types\/\d+/.test(pathname);
    if (isDetail) return route.continue();

    if (req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 1,
                workOrderType: 'MAJOR_REPAIR',
                costTreatment: 'CAPEX',
                defaultGlAccount: '10100',
                defaultUtilityAccount: 'UTIL-01',
                laborGlAccount: '10110',
                laborUtilityAccount: 'UTIL-01',
                inventoryGlAccount: '10120',
                inventoryUtilityAccount: 'UTIL-01',
                active: true,
              },
              {
                id: 2,
                workOrderType: 'MINOR_REPAIR',
                costTreatment: 'OPEX',
                defaultGlAccount: '20200',
                defaultUtilityAccount: 'UTIL-02',
                laborGlAccount: '20210',
                laborUtilityAccount: 'UTIL-02',
                inventoryGlAccount: '20220',
                inventoryUtilityAccount: 'UTIL-02',
                active: false,
              },
            ],
            totalElements: 2,
            page: 0,
            size: 10,
          },
        }),
      });
      return;
    }

    await route.continue();
  });
};

test.describe('Work Order Types', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists work order types with actions', async ({ page }) => {
    await mockList(page);

    await page.goto('/work-orders/types');

    // Ensure the list API actually returned (helps prevent flaky "empty row" assertions)
    await page.waitForResponse((resp) => {
      return resp.url().includes('/api/work-order-types') && resp.request().method() === 'GET' && resp.status() === 200;
    });

    // Fix strict mode violation: target the heading specifically.
    await expect(page.getByRole('heading', { name: 'Work Order Types' })).toBeVisible();

    await expect(page.getByText('Major repair', { exact: true })).toBeVisible();
    await expect(page.getByText('CAPEX')).toBeVisible();
    await expect(page.getByText('10100')).toBeVisible();

    await expect(page.getByRole('button', { name: '+ Create Work Order Type' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View' }).first()).toBeVisible();

    // Optional sanity check: ensure error row is NOT displayed
    await expect(page.getByText('Unable to load work order types.')).toHaveCount(0);
  });

  test('creates a work order type', async ({ page }) => {
    await mockList(page); // for initial list load (and after redirect back)

    let postPayload: any = {};
    await page.route('**/api/work-order-types', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 99 } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/work-orders/types');

    await page.waitForResponse((resp) => {
      return resp.url().includes('/api/work-order-types') && resp.request().method() === 'GET' && resp.status() === 200;
    });

    await page.getByRole('button', { name: '+ Create Work Order Type' }).click();

    await page.locator('input[formcontrolname="workOrderType"]').fill('INSPECTION');
    await page.locator('select[formcontrolname="costTreatment"]').selectOption('OPEX');
    await page.locator('input[formcontrolname="defaultGlAccount"]').fill('30000');
    await page.locator('input[formcontrolname="defaultUtilityAccount"]').fill('UTIL-03');
    await page.locator('input[formcontrolname="laborGlAccount"]').fill('30010');
    await page.locator('input[formcontrolname="laborUtilityAccount"]').fill('UTIL-03');
    await page.locator('input[formcontrolname="inventoryGlAccount"]').fill('30020');
    await page.locator('input[formcontrolname="inventoryUtilityAccount"]').fill('UTIL-03');
    await page.getByRole('button', { name: /Create Work Order Type/i }).click();

    expect(postPayload.workOrderType).toBe('INSPECTION');
    expect(postPayload.costTreatment).toBe('OPEX');
    expect(postPayload.defaultGlAccount).toBe('30000');
    expect(postPayload.active).toBe(true);

    await expect(page).toHaveURL(/\/work-orders\/types$/);
  });

  test('views a work order type', async ({ page }) => {
    await mockList(page);

    await page.route('**/api/work-order-types/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            workOrderType: 'MAJOR_REPAIR',
            costTreatment: 'CAPEX',
            defaultGlAccount: '10100',
            defaultUtilityAccount: 'UTIL-01',
            laborGlAccount: '10110',
            laborUtilityAccount: 'UTIL-01',
            inventoryGlAccount: '10120',
            inventoryUtilityAccount: 'UTIL-01',
            active: true,
          },
        }),
      });
    });

    await page.goto('/work-orders/types');

    await page.waitForResponse((resp) => {
      return resp.url().includes('/api/work-order-types') && resp.request().method() === 'GET' && resp.status() === 200;
    });

    await page.getByRole('link', { name: 'View' }).first().click();

    await expect(page).toHaveURL(/\/work-orders\/types\/view\/1$/);

    const detail = page.getByRole('main');
    await expect(detail.getByRole('heading', { name: 'Major repair' })).toBeVisible();
    await expect(detail.getByText('CAPEX')).toBeVisible();
    await expect(detail.getByText('10100')).toBeVisible();
    await expect(detail.getByText('UTIL-01')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });
});
