import { test, expect, Page, Request } from '@playwright/test';

interface PurchaseOrderPayload {
  vendorId?: number;
  expectedDelivery?: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  status?: string;
  lines?: Array<{
    itemId?: number;
    itemName?: string;
    qty?: number;
    orderedQty?: number;
    unitPrice?: number;
  }>;
  [key: string]: unknown;
}

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });
};

const mockPoList = async (page: Page) => {
  await page.route('**/api/procurement/po**', async route => {
    const url = route.request().url();
    // Only handle GET requests for the list endpoint, not specific IDs
    if (route.request().method() === 'GET' && !url.match(/\/po\/\d+$/)) {
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
                vendorName: 'Acme',
                expectedDelivery: '2026-02-20',
                status: 'APPROVED'
              },
              {
                id: 2,
                poNumber: 'PO-1002',
                vendor: 'Beta',
                vendorName: 'Beta',
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

const mockVendorsAndInventory = async (page: Page) => {
  await page.route('**/api/vendors**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 1, vendorName: 'Acme Supplies' },
          { id: 2, vendorName: 'Beta Corp' }
        ]
      })
    });
  });

  await page.route('**/api/inventory**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            { id: 100, itemName: 'Bolt', itemId: 'BLT-1' },
            { id: 101, itemName: 'Bearing', itemId: 'BRG-1' }
          ]
        }
      })
    });
  });
};

test.describe('Purchase Orders', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists purchase orders', async ({ page }) => {
    await mockPoList(page);
    await page.goto('/procurement/purchase-orders');

    const row1 = page.getByRole('row', { name: /PO-1001/i });
    await expect(row1.getByText('PO-1001')).toBeVisible();
    await expect(row1.getByText('Acme')).toBeVisible();
    await expect(row1.getByText(/Approved/i)).toBeVisible();

    const row2 = page.getByRole('row', { name: /PO-1002/i });
    await expect(row2.getByText('PO-1002')).toBeVisible();
    await expect(row2.getByText('Beta')).toBeVisible();
    await expect(row2.getByText(/Pending/i)).toBeVisible();
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
            vendorName: 'Acme',
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
    
    // Wait for the page to load and view link to be available
    await page.waitForLoadState('networkidle');
    const viewLink = page.getByRole('link', { name: /View/i }).first();
    await viewLink.waitFor({ state: 'visible', timeout: 10000 });
    await viewLink.click();

    await expect(page).toHaveURL(/\/procurement\/purchase-orders\/view\/1/, { timeout: 10000 });
    await expect(page.getByText('PO-1001')).toBeVisible();
    await expect(page.getByText('Acme')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
  });

  test('creates a purchase order', async ({ page }) => {
    await mockPoList(page); // for redirect after create
    await mockVendorsAndInventory(page); // for form dropdowns

    let postPayload: PurchaseOrderPayload = {};
    await page.route('**/api/procurement/po', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}') as PurchaseOrderPayload;
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
    
    // Wait for form to be ready
    await page.locator('select[name="vendorId"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Wait for options to populate
    
    await page.locator('select[name="vendorId"]').selectOption({ index: 1 }).catch(() => {});
    
    await page.locator('input[name="expectedDelivery"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="expectedDelivery"]').fill('2026-02-25');
    
    await page.locator('input[name="remarks"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="remarks"]').fill('Deliver ASAP');
    
    // Add one line item if present
    const addLineButton = page.getByText('+ Add Line Item');
    await addLineButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await addLineButton.click().catch(() => {});
    
    await page.locator('select[name^="itemId-"]').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500); // Wait for item options to populate
    await page.locator('select[name^="itemId-"]').first().selectOption({ index: 1 }).catch(() => {});
    await page.locator('input[name^="qty-"]').first().fill('3').catch(() => {});
    
    const createButton = page.getByRole('button', { name: /Create PO|Create Purchase Order/i });
    await createButton.waitFor({ state: 'visible' });
    await createButton.click();

    expect(postPayload.expectedDeliveryDate || postPayload.expectedDelivery).toBe('2026-02-25');
    expect(postPayload.remarks).toBe('Deliver ASAP');
    await expect(page).toHaveURL(/\/procurement\/purchase-orders$/, { timeout: 10000 });
  });

  test('updates a purchase order', async ({ page }) => {
    await mockPoList(page); // for redirect after update
    await mockVendorsAndInventory(page); // for form dropdowns

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
              vendorId: 2,
              vendor: 'Beta',
              expectedDelivery: '2026-02-28',
              remarks: 'Initial remarks',
              status: 'PENDING',
              lines: []
            }
          })
        });
        return;
      }
      if (method === 'PATCH' || method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 2 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: PurchaseOrderPayload = {};
    page.on('request', (req: Request) => {
      if ((req.method() === 'PATCH' || req.method() === 'PUT') && req.url().includes('/api/procurement/po/2')) {
        patchPayload = JSON.parse(req.postData() || '{}') as PurchaseOrderPayload;
      }
    });

    await page.goto('/procurement/purchase-orders/edit/2');
    
    // Wait for form to load
    await page.locator('input[name="remarks"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="remarks"]').fill('Update remarks');
    
    const updateButton = page.getByRole('button', { name: /Update PO|Update Purchase Order/i });
    await updateButton.waitFor({ state: 'visible' });
    await updateButton.click();

    expect(patchPayload.remarks).toBe('Update remarks');
    await expect(page).toHaveURL(/\/procurement\/purchase-orders$/, { timeout: 10000 });
  });

  test('deletes a purchase order from listing', async ({ page }) => {
    await mockPoList(page);
    let deleteCalled = false;
    await page.route('**/api/procurement/po/1', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/procurement/purchase-orders');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for delete button to be available
    const deleteButton = page.getByLabel(/Delete purchase order/i).first();
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteButton.click();
    
    // Wait for modal to appear
    await page.locator('.modal .deleteBtn').waitFor({ state: 'visible' });
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});