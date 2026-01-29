import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { WORK_ORDER: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });

const mockList = async (page: Page) => {
  await page.route('**/api/work-order-types**', async route => {
    if (route.request().method() === 'GET') {
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
                active: true
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
                active: false
              }
            ],
            totalElements: 2,
            page: 0,
            size: 10
          }
        })
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

    await expect(page.getByText('Work Order Types')).toBeVisible();
    await expect(page.getByText('Major repair', { exact: true })).toBeVisible();
    await expect(page.getByText('CAPEX')).toBeVisible();
    await expect(page.getByText('10100')).toBeVisible();

    await expect(page.getByRole('button', { name: '+ Create Work Order Type' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View' }).first()).toBeVisible();
  });

  test('creates a work order type', async ({ page }) => {
    await mockList(page); // for initial list load

    let postPayload: any = {};
    await page.route('**/api/work-order-types', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 99 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/work-orders/types');
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
    await page.route('**/api/work-order-types/1', async route => {
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
            active: true
          }
        })
      });
    });

    await page.goto('/work-orders/types');
    await page.getByRole('link', { name: 'View' }).first().click();

    await expect(page).toHaveURL(/\/work-orders\/types\/view\/1$/);
    await expect(page.getByText('Major repair')).toBeVisible();
    await expect(page.getByText('CAPEX')).toBeVisible();
    await expect(page.getByText('10100')).toBeVisible();
    await expect(page.getByText('UTIL-01')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });
});
