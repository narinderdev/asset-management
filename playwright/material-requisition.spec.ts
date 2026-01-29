import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });

const mockMrList = async (page: Page) => {
  await page.route('**/api/procurement/mr**', async route => {
    if (route.request().method() === 'GET') {
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

test.describe('Material Requisition', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists material requisitions', async ({ page }) => {
    await mockMrList(page);
    await page.goto('/procurement/material-requisitions');

    await expect(page.getByText('MR-1001')).toBeVisible();
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
    await page.getByRole('link', { name: /View/i }).first().click();

    await expect(page).toHaveURL(/\/procurement\/view/);
    await expect(page.getByText('MR-1001')).toBeVisible();
    await expect(page.getByText('Maintenance')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
  });

  test('creates a material requisition', async ({ page }) => {
    await mockMrList(page);

    let postPayload: any = {};
    await page.route('**/api/procurement/mr', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
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
    await page.locator('input[name="requestedBy"]').fill('Charlie');
    await page.locator('input[name="neededBy"]').fill('2026-02-20');
    await page.locator('input[name="department"]').fill('Ops');
    await page.getByText('+ Add Line Item').click();
    await page.locator('select[name="itemId-0"]').selectOption({ label: 'Item 1' }).catch(() => {});
    await page.locator('input[name="qty-0"]').fill('5');
    await page.getByRole('button', { name: /Create MR|Create Material/i }).click();

    expect(postPayload.requestedBy).toBe('Charlie');
    expect(postPayload.neededByDate || postPayload.neededBy).toBe('2026-02-20');
    await expect(page).toHaveURL(/\/procurement\/material-requisitions/);
  });

  test('updates a material requisition', async ({ page }) => {
    await mockMrList(page);

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
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 11 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: any = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/procurement/mr/11')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/procurement/edit/11');
    await page.locator('input[name="department"]').fill('Ops Updated');
    await page.getByRole('button', { name: /Update/i }).click();

    expect(patchPayload.department).toBe('Ops Updated');
    await expect(page).toHaveURL(/\/procurement\/material-requisitions/);
  });

  test('deletes a material requisition from listing', async ({ page }) => {
    await mockMrList(page);
    let deleteCalled = false;
    await page.route('**/api/procurement/mr/10', async route => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/procurement/material-requisitions');
    await page.getByLabel(/Delete material requisition/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
