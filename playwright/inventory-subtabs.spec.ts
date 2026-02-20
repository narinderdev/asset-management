import { expect, test, type Page } from '@playwright/test';

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({
        modules: {
          INVENTORY: ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
        }
      })
    );
  });
};

const mockInventorySubtabsApis = async (page: Page) => {
  await page.route('**/api/inventory/reconciliations**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalElements: 1,
          size: 10,
          number: 0,
          content: [
            {
              id: 101,
              warehouseName: 'Main Warehouse',
              itemId: 'INV-1',
              skuNumber: 'SKU-1',
              itemName: 'Bearing',
              reconcileDate: '2026-02-20',
              systemQuantity: 10,
              physicalQuantity: 12,
              varianceQuantity: 2,
              varianceCost: 100,
              status: 'SUBMITTED',
              enteredBy: 'admin'
            }
          ]
        }
      })
    });
  });

  await page.route('**/api/inventory/audit-logs**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalElements: 1,
          size: 10,
          number: 0,
          content: [
            {
              id: 900,
              transactionType: 'IN',
              referenceType: 'GRN',
              referenceNumber: 'GRN-2026-001',
              itemId: 'INV-1',
              skuNumber: 'SKU-1',
              itemName: 'Bearing',
              beforeQuantity: 10,
              afterQuantity: 12,
              varianceQuantity: 2,
              performedBy: 'admin',
              reason: 'Restocked'
            }
          ]
        }
      })
    });
  });
};

const ensureInventorySubmenuOpen = async (page: Page) => {
  const reconcileLink = page.getByRole('link', { name: 'Inventory Reconcile' }).first();
  if (!(await reconcileLink.isVisible())) {
    await page.locator('a.menu-link', { hasText: 'Inventory' }).first().click();
  }
};

test.describe('Inventory Subtabs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockInventorySubtabsApis(page);
  });

  test('opens Inventory Reconcile tab and shows data', async ({ page }) => {
    await page.goto('/inventory/reconcile');

    await expect(page).toHaveURL(/\/inventory\/reconcile$/);
    await expect(page.getByRole('heading', { name: 'Inventory Reconcile' })).toBeVisible();
    await expect(page.getByText('Main Warehouse')).toBeVisible();
    await expect(page.getByText('Bearing')).toBeVisible();
  });

  test('opens Inventory Audit Logs tab from sidebar', async ({ page }) => {
    await page.goto('/inventory/reconcile');
    await ensureInventorySubmenuOpen(page);

    await page.getByRole('link', { name: 'Inventory Audit Logs' }).first().click();

    await expect(page).toHaveURL(/\/inventory\/audit-logs$/);
    await expect(page.getByRole('heading', { name: 'Inventory Audit Logs' })).toBeVisible();
    await expect(page.getByText('GRN-2026-001')).toBeVisible();
    await expect(page.getByText('Restocked')).toBeVisible();
  });
});
