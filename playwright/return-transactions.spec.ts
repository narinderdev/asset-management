import { expect, test, type Page } from '@playwright/test';

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });
};

const mockReturnTransactions = async (page: Page, responses: Array<any[]>) => {
  let callIndex = 0;
  await page.route('**/api/procurement/returns', async route => {
    if (route.request().method() === 'GET') {
      const content = responses[Math.min(callIndex, responses.length - 1)] ?? [];
      callIndex += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'ok',
          data: content
        })
      });
      return;
    }
    await route.continue();
  });
};

test.describe('Return Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists return transactions', async ({ page }) => {
    await mockReturnTransactions(page, [
      [
        {
          id: 1,
          grnNumber: 'GRN-2026-001',
          itemName: 'Bearing',
          itemId: 'INV-1',
          receivedQty: 10,
          returnQty: 2,
          totalReturnedQty: 2,
          unitCost: 25,
          returnCost: 50,
          reason: 'Damaged in transit',
          performedBy: 'store-admin'
        }
      ]
    ]);

    await page.goto('/procurement/returns');

    await expect(page.getByRole('heading', { name: 'Return Transaction' })).toBeVisible();
    await expect(page.getByText('GRN-2026-001')).toBeVisible();
    await expect(page.getByText('Bearing')).toBeVisible();
    await expect(page.getByText('Damaged in transit')).toBeVisible();
    await expect(page.getByText('store-admin')).toBeVisible();
  });

  test('shows empty state when no return transactions exist', async ({ page }) => {
    await mockReturnTransactions(page, [[]]);

    await page.goto('/procurement/returns');

    await expect(page.getByText('No return transactions found.')).toBeVisible();
  });

  test('refresh button reloads data', async ({ page }) => {
    await mockReturnTransactions(page, [
      [
        {
          id: 1,
          grnNumber: 'GRN-2026-001',
          itemName: 'Bearing',
          itemId: 'INV-1',
          returnQty: 1,
          reason: 'Initial'
        }
      ],
      [
        {
          id: 2,
          grnNumber: 'GRN-2026-002',
          itemName: 'Seal',
          itemId: 'INV-2',
          returnQty: 3,
          reason: 'Updated'
        }
      ]
    ]);

    await page.goto('/procurement/returns');
    await expect(page.getByText('GRN-2026-001')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.getByText('GRN-2026-002')).toBeVisible();
    await expect(page.getByText('Seal')).toBeVisible();
    await expect(page.getByText('Updated')).toBeVisible();
  });
});

