import { expect, test, type Page } from '@playwright/test';

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({
        modules: {
          INVENTORY: ['VIEW'],
          WORK_ORDER: ['VIEW']
        }
      })
    );
  });
};

const mockReportApis = async (page: Page) => {
  await page.route('**/api/warehouses**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 1, name: 'Main Warehouse' }]
      })
    });
  });

  await page.route('**/api/inventory/report**', async route => {
    const url = new URL(route.request().url());
    const view = url.searchParams.get('view');

    if (view === 'TRANSACTIONS') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            transactions: {
              totalElements: 1,
              totalPages: 1,
              number: 0,
              size: 10,
              content: [
                {
                  dateTime: '2026-02-20T10:00:00Z',
                  transactionType: 'RECEIVE',
                  itemName: 'Bearing',
                  qtyBefore: 5,
                  qtyChange: 10,
                  qtyAfter: 15,
                  referenceType: 'PURCHASE_ORDER',
                  referenceNumber: 'PO-001'
                }
              ]
            },
            totalQuantityByTxnType: {
              RECEIVE: 10
            }
          }
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: {
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 10,
            content: [
              {
                itemId: 'INV-1',
                skuNumber: 'SKU-1',
                itemName: 'Bearing',
                stockLevel: 15,
                reorderPoint: 5,
                warehouseName: 'Main Warehouse',
                unitCost: 25
              }
            ]
          },
          top5HighStock: [],
          topStockValue: []
        }
      })
    });
  });

  await page.route('**/api/reports/work-orders**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalElements: 1,
          totalPages: 1,
          size: 10,
          workOrders: [
            {
              id: 1,
              workOrderId: 'WO-1',
              woTitle: 'Inspect Pump',
              assetName: 'Pump A',
              assignedTechnicianName: 'Alex',
              priority: 'HIGH',
              status: 'IN_PROGRESS'
            }
          ]
        }
      })
    });
  });
};

test.describe('Reports Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockReportApis(page);
  });

  test('loads Inventory Report tab', async ({ page }) => {
    await page.goto('/reports/inventory');

    await expect(page.getByRole('heading', { name: 'Inventory Report' })).toBeVisible();
    await expect(page.getByText('INV-1')).toBeVisible();
    await expect(page.getByText('Bearing')).toBeVisible();
  });

  test('loads Transaction Report tab', async ({ page }) => {
    await page.goto('/reports/transactions');

    await expect(page.getByRole('heading', { name: 'Transaction Report' })).toBeVisible();
    await expect(page.locator('.table-row', { hasText: 'RECEIVE' }).first()).toBeVisible();
    await expect(page.getByText('PO-001')).toBeVisible();
  });

  test('loads Work Order Report tab', async ({ page }) => {
    await page.goto('/reports/work-orders');

    await expect(page.getByRole('heading', { name: 'Work Order Report' })).toBeVisible();
    await expect(page.getByText('WO-1')).toBeVisible();
    await expect(page.getByText('Inspect Pump')).toBeVisible();
  });
});
