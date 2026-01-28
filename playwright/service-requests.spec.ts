import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page, perms: string[] = ['CREATE', 'UPDATE', 'DELETE']) =>
  page.addInitScript(({ perms }) => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { SERVICE_REQUEST: perms } }));
  }, { perms });

const mockListApi = async (page: Page) => {
  await page.route('**/api/service-requests**', async (route) => {
    const url = new URL(route.request().url());
    const pageParam = Number(url.searchParams.get('page') ?? '0');
    const sizeParam = Number(url.searchParams.get('size') ?? '10');
    const content = [
      {
        id: 101,
        requestId: 'SR-101',
        requestDate: '2026-01-10T00:00:00Z',
        requesterName: 'Alice',
        shortTitle: 'Broken belt',
        maintenanceType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'NEW'
      },
      {
        id: 102,
        requestId: 'SR-102',
        requestDate: '2026-01-11T00:00:00Z',
        requesterName: 'Bob',
        shortTitle: 'Noise on pump',
        maintenanceType: 'INSPECTION',
        priority: 'LOW',
        status: 'UNDER_REVIEW'
      }
    ].slice(pageParam * sizeParam, (pageParam + 1) * sizeParam);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalElements: 2,
          size: sizeParam,
          number: pageParam,
          content
        }
      })
    });
  });
};

const mockAssets = async (page: Page) => {
  await page.route('**/api/assets**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            { id: 1, assetId: 'AST-1', assetName: 'Pump A' },
            { id: 2, assetId: 'AST-2', assetName: 'Conveyor B' }
          ]
        }
      })
    });
  });
};

test.describe('Service Requests', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists service requests with normalized fields', async ({ page }) => {
    await mockListApi(page);

    await page.goto('/service-requests');

    await expect(page.getByText('Service Request Management')).toBeVisible();
    await expect(page.getByText('SR-101')).toBeVisible();
    await expect(page.getByText('Broken belt')).toBeVisible();
    await expect(page.getByText('Corrective')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByText('New')).toBeVisible();

    await expect(page.getByText('SR-102')).toBeVisible();
    await expect(page.getByText('Inspection')).toBeVisible();
    await expect(page.getByText('Low')).toBeVisible();
    await expect(page.getByText('Under Review')).toBeVisible();
  });

  test('creates a service request', async ({ page }) => {
    await mockAssets(page);

    let postPayload: Record<string, unknown> = {};
    await page.route('**/api/service-requests', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: '200', requestId: 'SR-200' } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/service-requests/create');

    await page.locator('input[name="requestId"]').fill('SR-NEW');
    await page.locator('input[name="requesterName"]').fill('Charlie');
    await page.locator('input[name="requesterContact"]').fill('555-1234');
    await page.locator('input[name="location"]').fill('Plant 1');
    await page.locator('input[name="shortTitle"]').fill('Vibration issue');
    await page.locator('input[name="problemDescription"]').fill('Motor vibrating heavily');

    await page.locator('select[name="maintenanceType"]').selectOption('CORRECTIVE');
    await page.locator('select[name="priority"]').selectOption('HIGH');
    await page.locator('select[name="asset"]').selectOption({ label: 'Pump A' });

    await page.getByRole('button', { name: /Save|Create/i }).click();

    expect(postPayload.requestId).toBe('SR-NEW');
    expect(postPayload.requesterName).toBe('Charlie');
    expect(postPayload.maintenanceType).toBe('CORRECTIVE');
    expect(postPayload.priority).toBe('HIGH');
    expect(postPayload.assetId).toBe(1);
    expect(postPayload.shortTitle).toBe('Vibration issue');
    expect(postPayload.problemDescription).toBe('Motor vibrating heavily');

    await expect(page).toHaveURL(/\/service-requests$/);
  });

  test('edits a service request', async ({ page }) => {
    await mockAssets(page);

    await page.route('**/api/service-requests/123', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 123,
              requestId: 'SR-123',
              requesterName: 'Dana',
              location: 'Line 2',
              maintenanceType: 'PREVENTIVE',
              priority: 'MEDIUM',
              shortTitle: 'Filter change',
              problemDescription: 'Replace filters',
              preferredDate: '2026-01-29',
              preferredTime: '10:00',
              status: 'NEW',
              assetDbId: 2
            }
          })
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 123 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: Record<string, unknown> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/service-requests/123')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/service-requests/edit/123');
    await page.locator('input[name="shortTitle"]').fill('Filter change updated');
    await page.getByRole('button', { name: /Update|Save/i }).click();

    expect(patchPayload.shortTitle).toBe('Filter change updated');
    expect(patchPayload.maintenanceType).toBe('PREVENTIVE');
    await expect(page).toHaveURL(/\/service-requests$/);
  });

  test('deletes a service request from listing', async ({ page }) => {
    await mockListApi(page);
    let deleteCalled = false;
    await page.route('**/api/service-requests/101', async (route) => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/service-requests');
    await page.waitForTimeout(200); // allow table render

    await page.getByLabel('Delete service request').first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
