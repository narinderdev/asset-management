import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });

const mockPoList = async (page: Page) => {
  await page.route('**/api/procurement/po**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 1,
                poNumber: 'PO-1001',
                vendor: 'Acme',
                expectedDelivery: '2026-02-20',
                status: 'APPROVED'
              },
              {
                id: 2,
                poNumber: 'PO-1002',
                vendor: 'Beta',
                expectedDelivery: '2026-02-28',
                status: 'PENDING'
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

test.describe('Purchase Orders', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists purchase orders', async ({ page }) => {
    await mockPoList(page);
    await page.goto('/procurement/purchase-orders');

    await expect(page.getByText('PO-1001')).toBeVisible();
    await expect(page.getByText('Acme')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
    await expect(page.getByText('PO-1002')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('views purchase order detail', async ({ page }) => {
    await mockPoList(page);
    await page.route('**/api/procurement/po/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            poNumber: 'PO-1001',
            vendor: 'Acme',
            expectedDelivery: '2026-02-20',
            status: 'APPROVED',
            lines: [
              { itemName: 'Bolt', orderedQty: 10, unitPrice: 2 },
              { itemName: 'Bearing', orderedQty: 2, unitPrice: 15 }
            ]
          }
        })
      });
    });

    await page.goto('/procurement/purchase-orders');
    await page.getByRole('link', { name: /View/i }).first().click();

    await expect(page).toHaveURL(/\/procurement\/purchase-orders\/view\/1/);
    await expect(page.getByText('PO-1001')).toBeVisible();
    await expect(page.getByText('Acme')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
  });

  test('creates a purchase order', async ({ page }) => {
    await mockPoList(page); // for listing and dropdowns if any

    let postPayload: any = {};
    await page.route('**/api/procurement/po', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 999, poNumber: 'PO-9999' } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/procurement/purchase-orders/create');
    await page.locator('select[name="vendorId"]').selectOption({ index: 1 }).catch(() => {});
    await page.locator('input[name="expectedDelivery"]').fill('2026-02-25');
    await page.locator('input[name="remarks"]').fill('Deliver ASAP');
    // Add one line item if present
    await page.getByText('+ Add Line Item').click().catch(() => {});
    await page.locator('select[name^="itemId-"]').first().selectOption({ index: 1 }).catch(() => {});
    await page.locator('input[name^="qty-"]').first().fill('3');
    await page.getByRole('button', { name: /Create PO|Create Purchase Order/i }).click();

    expect(postPayload.expectedDeliveryDate || postPayload.expectedDelivery).toBe('2026-02-25');
    expect(postPayload.remarks).toBe('Deliver ASAP');
    await expect(page).toHaveURL(/\/procurement\/purchase-orders$/);
  });

  test('updates a purchase order', async ({ page }) => {
    await mockPoList(page);

    await page.route('**/api/procurement/po/2', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 2,
              poNumber: 'PO-1002',
              vendor: 'Beta',
              expectedDelivery: '2026-02-28',
              status: 'PENDING'
            }
          })
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 2 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: any = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/procurement/po/2')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/procurement/purchase-orders/edit/2');
    await page.locator('input[name="remarks"]').fill('Update remarks');
    await page.getByRole('button', { name: /Update PO|Update Purchase Order/i }).click();

    expect(patchPayload.remarks).toBe('Update remarks');
    await expect(page).toHaveURL(/\/procurement\/purchase-orders$/);
  });

  test('deletes a purchase order from listing', async ({ page }) => {
    await mockPoList(page);
    let deleteCalled = false;
    await page.route('**/api/procurement/po/1', async route => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/procurement/purchase-orders');
    await page.getByLabel(/Delete purchase order/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
