import { test, expect, Page } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { PROCUREMENT: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });

const mockGrnList = async (
  page: Page,
  pages: Record<number, any[]> = {
    0: [
      {
        id: 101,
        grnNumber: 'GRN-101',
        poId: 10,
        vendorId: 55,
        receivedByUserId: 'receiver.a',
        receivedAtUtc: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-21T12:00:00Z',
        notes: 'First receipt'
      },
      {
        id: 102,
        grnNumber: 'GRN-102',
        poId: 11,
        vendorId: 77,
        receivedByUserId: 'receiver.b',
        receivedAtUtc: '2026-01-22T10:00:00Z',
        updatedAt: '2026-01-22T12:00:00Z',
        notes: 'Second receipt'
      }
    ],
    1: [
      {
        id: 103,
        grnNumber: 'GRN-103',
        poId: 12,
        vendorId: 88,
        receivedByUserId: 'receiver.c',
        receivedAtUtc: '2026-01-23T10:00:00Z',
        updatedAt: '2026-01-23T12:00:00Z',
        notes: 'Page 2 receipt'
      }
    ]
  }
) => {
  const totalElements = Object.values(pages).reduce((acc, list) => acc + list.length, 0);

  await page.route('**/api/procurement/grn**', async route => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const pageIndex = Number(url.searchParams.get('page') || '0') || 0;
      const content = pages[pageIndex] ?? [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalElements,
            size: 2,
            number: pageIndex,
            content
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const mockGrnDetail = async (page: Page, id: number) => {
  await page.route(`**/api/procurement/grn/${id}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id,
          grnNumber: `GRN-${id}`,
          poId: 10,
          vendorId: 55,
          receivedByUserId: 'receiver.a',
          receivedAtUtc: '2026-01-20T10:00:00Z',
          createdAt: '2026-01-20T08:00:00Z',
          updatedAt: '2026-01-21T12:00:00Z',
          notes: 'Detailed receipt notes',
          status: 'APPROVED',
          lines: [
            { id: 1, itemId: 9001, itemName: 'Bolt', receivedQty: 5, uom: 'EA' },
            { id: 2, itemId: 9002, itemName: 'Nut', receivedQty: 10, uom: 'EA' }
          ]
        }
      })
    });
  });
};

const mockInventoryOptions = async (page: Page) => {
  await page.route('**/api/inventory-items**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalElements: 1,
          size: 100,
          number: 0,
          content: [{ id: 501, itemName: 'Bearing', itemId: 'INV-501', unitOfMeasure: 'EA' }]
        }
      })
    });
  });
};

test.describe('Goods Receipts (GRN)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists goods receipts', async ({ page }) => {
    await mockGrnList(page);

    await page.goto('/procurement/goods-receipts');

    await expect(page.getByRole('heading', { name: /Goods Receipt/i })).toBeVisible();
    await expect(page.getByText('GRN-101')).toBeVisible();
    await expect(page.getByText('receiver.a')).toBeVisible();
    await expect(page.getByText('GRN-102')).toBeVisible();
    await expect(page.getByLabel(/View goods receipt/i).first()).toBeVisible();
  });

  test('shows empty state when no goods receipts exist', async ({ page }) => {
    await mockGrnList(page, { 0: [] });

    await page.goto('/procurement/goods-receipts');

    await expect(page.getByText('No goods receipts to display.')).toBeVisible();
  });

  test('views a goods receipt detail', async ({ page }) => {
    await mockGrnList(page);
    await mockGrnDetail(page, 101);

    await page.goto('/procurement/goods-receipts');
    await page.getByLabel(/View goods receipt/i).first().click();

    await expect(page).toHaveURL(/\/procurement\/goods-receipts\/view\/101/);
    await expect(page.getByRole('heading', { level: 1, name: /GRN Details/i })).toBeVisible();
    await expect(page.getByText('GRN-101')).toBeVisible();
    await expect(page.getByText('receiver.a')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
    await expect(page.getByText('Nut')).toBeVisible();
    await expect(page.getByText('Detailed receipt notes')).toBeVisible();
  });

  test('creates a goods receipt (GRN)', async ({ page }) => {
    await mockInventoryOptions(page);
    await mockGrnList(page, { 0: [] });

    let postPayload: Record<string, any> = {};
    await page.route('**/api/procurement/grn', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 999, grnNumber: 'GRN-999' } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/procurement/goods-receipts/create');
    await page.waitForSelector('form.request-form');

    await page.locator('input[name="receivedBy"]').fill('receiver.z');
    await page.locator('input[name="notes"]').fill('Urgent delivery');
    await page.getByRole('combobox').first().selectOption('501');
    const firstLine = page.locator('.line-item-row').first();
    await firstLine.locator('input[type="number"]').nth(1).fill('5'); // ordered qty
    await firstLine.locator('input[type="number"]').nth(2).fill('4'); // received qty
    await firstLine.locator('input[type="number"]').nth(3).fill('1'); // return qty

    await Promise.all([
      page.waitForURL(/\/procurement\/goods-receipts$/),
      page.getByRole('button', { name: /Create GRN/i }).click()
    ]);

    expect(postPayload.receivedByUserId).toBe('receiver.z');
    expect(postPayload.notes).toBe('Urgent delivery');
    expect(postPayload.lines?.[0]?.itemId).toBe(501);
    expect(postPayload.lines?.[0]?.orderedQty).toBe(5);
    expect(postPayload.lines?.[0]?.receivedQty).toBe(4);
    expect(postPayload.lines?.[0]?.returnQty).toBe(1);
  });
});
