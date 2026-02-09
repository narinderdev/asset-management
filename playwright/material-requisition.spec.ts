import { test, expect, Page, Request } from '@playwright/test';

interface MaterialRequisitionPayload {
  requestedBy?: string;
  neededBy?: string;
  neededByDate?: string;
  department?: string;
  shippingLocation?: string;
  status?: string;
  lines?: Array<{
    itemId?: number;
    itemName?: string;
    qty?: number;
    uom?: string;
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

const mockMrList = async (page: Page) => {
  await page.route('**/api/procurement/mr**', async route => {
    const url = route.request().url();
    if (route.request().method() === 'GET' && !url.includes('/api/procurement/mr/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 10,
                mrId: 'MR-1001',
                requester: 'Alice',
                requiredBy: '2026-02-10',
                status: 'APPROVED'
              },
              {
                id: 11,
                mrId: 'MR-1002',
                requester: 'Bob',
                requiredBy: '2026-02-15',
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

const mockInventoryItems = async (page: Page) => {
  await page.route('**/api/inventory**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            { id: 1, itemName: 'Item 1', itemId: 'ITM-1' },
            { id: 2, itemName: 'Item 2', itemId: 'ITM-2' }
          ]
        }
      })
    });
  });
};

test.describe('Material Requisition', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists material requisitions', async ({ page }) => {
    await mockMrList(page);
    await page.goto('/procurement/material-requisitions');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.getByText('MR-1001')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
    await expect(page.getByText('MR-1002')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('views material requisition detail', async ({ page }) => {
    await mockMrList(page);
    await page.route('**/api/procurement/mr/10', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 10,
            mrId: 'MR-1001',
            requester: 'Alice',
            requiredBy: '2026-02-10',
            department: 'Maintenance',
            shippingLocation: 'WAREHOUSE',
            status: 'APPROVED',
            lines: [
              { itemName: 'Bolt', qty: 10, uom: 'EA' },
              { itemName: 'Bearing', qty: 2, uom: 'EA' }
            ]
          }
        })
      });
    });

    await page.goto('/procurement/material-requisitions');
    
    // Wait for the page to load and view link to be available
    const viewLink = page.getByRole('link', { name: /View/i }).first();
    await viewLink.waitFor({ state: 'visible', timeout: 10000 });
    await viewLink.click();

    await expect(page).toHaveURL(/\/procurement\/view/, { timeout: 10000 });
    await expect(page.getByText('MR-1001')).toBeVisible();
    await expect(page.getByText('Maintenance')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
  });

  test('creates a material requisition', async ({ page }) => {
    await mockMrList(page);
    await mockInventoryItems(page);

    let postPayload: MaterialRequisitionPayload = {};
    await page.route('**/api/procurement/mr', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}') as MaterialRequisitionPayload;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 99, mrId: 'MR-9999' } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/procurement/create');
    
    // Wait for form to be ready
    await page.locator('input[name="requestedBy"]').waitFor({ state: 'visible', timeout: 10000 });
    
    await page.locator('input[name="requestedBy"]').fill('Charlie');
    await page.locator('input[name="neededBy"]').fill('2026-02-20');
    
    // Wait for department field to be available
    await page.locator('input[name="department"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="department"]').fill('Ops');
    
    // Add line item
    const addLineButton = page.getByText('+ Add Line Item');
    await addLineButton.waitFor({ state: 'visible' });
    await addLineButton.click();
    
    // Wait for line item fields
    await page.locator('select[name="itemId-0"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.locator('select[name="itemId-0"]').selectOption({ label: 'Item 1' }).catch(() => {});
    await page.locator('input[name="qty-0"]').fill('5');
    
    await page.getByRole('button', { name: /Create MR|Create Material/i }).click();

    expect(postPayload.requestedBy).toBe('Charlie');
    expect(postPayload.neededByDate || postPayload.neededBy).toBe('2026-02-20');
    await expect(page).toHaveURL(/\/procurement\/material-requisitions/, { timeout: 10000 });
  });

  test('updates a material requisition', async ({ page }) => {
    await mockMrList(page);
    await mockInventoryItems(page);

    await page.route('**/api/procurement/mr/11', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 11,
              mrId: 'MR-1002',
              requester: 'Bob',
              neededBy: '2026-02-15',
              department: 'Ops',
              status: 'PENDING',
              lines: [{ itemId: 1, qty: 3, uom: 'EA' }]
            }
          })
        });
        return;
      }
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 11 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: MaterialRequisitionPayload = {};
    page.on('request', (req: Request) => {
      if ((req.method() === 'PATCH' || req.method() === 'PUT') && req.url().includes('/api/procurement/mr/11')) {
        patchPayload = JSON.parse(req.postData() || '{}') as MaterialRequisitionPayload;
      }
    });

    await page.goto('/procurement/edit/11');
    
    // Wait for form to load
    await page.locator('input[name="department"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="department"]').fill('Ops Updated');
    
    const updateButton = page.getByRole('button', { name: /Update/i });
    await updateButton.waitFor({ state: 'visible' });
    await updateButton.click();

    expect(patchPayload.department).toBe('Ops Updated');
    await expect(page).toHaveURL(/\/procurement\/material-requisitions/, { timeout: 10000 });
  });

  test('deletes a material requisition from listing', async ({ page }) => {
    await mockMrList(page);
    let deleteCalled = false;
    await page.route('**/api/procurement/mr/10', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/procurement/material-requisitions');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for delete button to be available
    const deleteButton = page.getByLabel(/Delete material requisition/i).first();
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteButton.click();
    
    // Wait for modal to appear
    await page.locator('.modal .deleteBtn').waitFor({ state: 'visible' });
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
