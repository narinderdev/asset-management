import { test, expect, Page, Request } from '@playwright/test';

interface InventoryPayload {
  itemId?: string;
  itemName?: string;
  category?: string;
  unitOfMeasure?: string;
  manufacturer?: string;
  stockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  costPerUnit?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  [key: string]: unknown;
}

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { INVENTORY: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { INVENTORY: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });
};

const mockInventoryList = async (page: Page) => {
  await page.route('**/api/inventory-items**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalElements: 2,
            size: 10,
            number: 0,
            content: [
              { id: 1, itemId: 'INV-1', itemName: 'Bearing', category: 'Mechanical', manufacturer: 'SKF', stockLevel: 5, reorderPoint: 2, costPerUnit: 10 },
              { id: 2, itemId: 'INV-2', itemName: 'Seal', category: 'Mechanical', manufacturer: 'Trelleborg', stockLevel: 0, reorderPoint: 1, costPerUnit: 4 }
            ]
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const mockWarehouseVendor = async (page: Page) => {
  await page.route('**/api/warehouses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 50, name: 'Default WH' }] })
    });
  });

  await page.route('**/api/vendors**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 60, vendorName: 'Vendor A' }] })
    });
  });
};

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists inventory items', async ({ page }) => {
    await mockInventoryList(page);
    await page.goto('/inventory');

    await expect(page.getByRole('heading', { name: /Parts & Inventory Management/i })).toBeVisible();
    await expect(page.getByText('INV-1')).toBeVisible();
    await expect(page.getByText('Bearing')).toBeVisible();
    await expect(page.getByText('SKF')).toBeVisible();
    await expect(page.getByText('INV-2')).toBeVisible();
    await expect(page.getByText('Out of Stock')).toBeVisible();
  });

  test('creates an inventory item', async ({ page }) => {
    await mockWarehouseVendor(page);
    await mockInventoryList(page); // Mock list for redirect after create
    
    let postPayload: InventoryPayload = {};
    await page.route('**/api/inventory-items', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}') as InventoryPayload;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 10 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/inventory/create');
    await page.waitForSelector('form.request-form', { state: 'visible' });
    await page.locator('form.request-form').waitFor();

    await page.locator('input[name="itemId"]').fill('INV-NEW');
    await page.locator('input[name="itemName"]').fill('Coupling');
    await page.locator('input[name="category"]').fill('Mechanical');
    await page.locator('select[name="unitOfMeasure"]').selectOption({ index: 1 });
    await page.locator('input[name="manufacturer"]').fill('Rexnord');
    await page.locator('input[name="stockLevel"]').fill('10');
    await page.locator('input[name="reorderPoint"]').fill('2');
    await page.locator('input[name="reorderQuantity"]').fill('5');
    await page.locator('input[name="costPerUnit"]').fill('25');
    await page.locator('input[name="minStockLevel"]').fill('1');
    await page.locator('input[name="maxStockLevel"]').fill('20');

    await page.getByRole('button', { name: /Create/ }).click();

    expect(postPayload.itemId).toBe('INV-NEW');
    expect(postPayload.itemName).toBe('Coupling');
    expect(postPayload.stockLevel).toBe(10);
    expect(postPayload.reorderPoint).toBe(2);
    expect(postPayload.costPerUnit).toBe(25);
    await expect(page).toHaveURL(/\/inventory$/, { timeout: 10000 });
  });

  test('updates an inventory item', async ({ page }) => {
    await mockWarehouseVendor(page);
    await mockInventoryList(page); // Mock list for redirect after update
    
    await page.route('**/api/inventory-items/5', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 5,
              itemId: 'INV-5',
              itemName: 'Grease',
              category: 'Lubricants',
              unitOfMeasure: 'Tube',
              manufacturer: 'Mobil',
              stockLevel: 3,
              reorderPoint: 1,
              reorderQuantity: 2,
              costPerUnit: 12,
              minStockLevel: 1,
              maxStockLevel: 10
            }
          })
        });
        return;
      }
      if (method === 'PATCH' || method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 5 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: InventoryPayload = {};
    page.on('request', (req: Request) => {
      if ((req.method() === 'PATCH' || req.method() === 'PUT') && req.url().includes('/api/inventory-items/5')) {
        patchPayload = JSON.parse(req.postData() || '{}') as InventoryPayload;
      }
    });

    await page.goto('/inventory/edit/5');
    await page.waitForSelector('form.request-form', { state: 'visible' });
    await page.waitForSelector('.loading-overlay', { state: 'hidden' }).catch(() => {});
    
    // Wait for the form to be fully populated
    await page.locator('input[name="itemName"]').waitFor({ state: 'visible' });
    await page.locator('input[name="itemName"]').fill('Grease Updated');
    
    const updateBtn = page.getByRole('button', { name: /Update/ });
    await updateBtn.waitFor({ state: 'visible' });
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();

    expect(patchPayload.itemName).toBe('Grease Updated');
    await expect(page).toHaveURL(/\/inventory$/, { timeout: 10000 });
  });

  test('deletes an inventory item from listing', async ({ page }) => {
    await mockInventoryList(page);
    let deleteCalled = false;
    await page.route('**/api/inventory-items/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/inventory');
    await page.waitForTimeout(200);

    // Wait for delete button to be visible
    const deleteButton = page.getByLabel('Delete item').first();
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteButton.click();
    
    // Wait for modal to appear
    await page.locator('.modal .deleteBtn').waitFor({ state: 'visible' });
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});