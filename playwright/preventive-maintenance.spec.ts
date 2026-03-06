import { test, expect, Page, Request } from '@playwright/test';

interface PreventiveMaintenancePayload {
  assetId?: number;
  assetTypeId?: number;
  title?: string;
  priority?: string;
  location?: string;
  startDate?: string;
  scheduleType?: string;
  intervalUnit?: string;
  intervalValue?: number;
  leadTimeDays?: number;
  applyTo?: string;
  [key: string]: unknown;
}

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { PREVENTIVE_MAINTENANCE: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { PREVENTIVE_MAINTENANCE: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });
};

const mockPmList = async (page: Page) => {
  await page.route('**/api/maintenance/preventive**', async (route) => {
    const url = route.request().url();
    // Only handle GET requests for the list endpoint, not specific IDs
    if (route.request().method() === 'GET' && !url.match(/\/preventive\/\d+$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalElements: 2,
            size: 10,
            number: 0,
            content: [
              {
                id: 1,
                title: 'Quarterly Inspection',
                assetName: 'Pump A',
                location: 'Plant 1',
                startDate: '2026-02-01T00:00:00Z',
                priority: 'HIGH',
                active: true
              },
              {
                id: 2,
                title: 'Filter Change',
                assetName: 'Conveyor B',
                location: 'Line 2',
                startDate: '2026-02-15T00:00:00Z',
                priority: 'LOW',
                active: false
              }
            ]
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const mockAssetsAndTypes = async (page: Page) => {
  await page.route('**/api/assets**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { content: [{ id: 1, assetName: 'Pump A' }, { id: 2, assetName: 'Conveyor B' }] }
      })
    });
  });
  await page.route('**/api/asset-types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 10, name: 'Pumps' }, { id: 11, name: 'Conveyors' }]
      })
    });
  });
};

test.describe('Preventive Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists preventive maintenance templates', async ({ page }) => {
    await mockPmList(page);

    await page.goto('/maintenance/preventive');

    await expect(page.getByRole('heading', { name: /Preventive Maintenance/i })).toBeVisible();
    await expect(page.getByText('Quarterly Inspection')).toBeVisible();
    await expect(page.getByText('Pump A')).toBeVisible();
    await expect(page.getByText('Yes')).toBeVisible();
    await expect(page.getByText('Filter Change')).toBeVisible();
    await expect(page.getByText('No')).toBeVisible();
  });

  test('creates a preventive maintenance template', async ({ page }) => {
    await mockAssetsAndTypes(page);
    await mockPmList(page); // Mock list for redirect after create

    let postPayload: PreventiveMaintenancePayload = {};
    await page.route('**/api/maintenance/preventive', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}') as PreventiveMaintenancePayload;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 50 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/preventive-maintenance/create');

    // Wait for form to be ready
    await page.locator('select[name="applyTo"]').waitFor({ state: 'visible', timeout: 10000 });
    
    await page.locator('select[name="applyTo"]').selectOption('ASSET');
    
    // Wait for asset select to appear after applyTo selection
    await page.locator('select[name="assetId"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('select[name="assetId"]').selectOption({ label: 'Pump A' });
    
    await page.locator('input[name="title"]').fill('Quarterly Pump Check');
    await page.locator('select[name="priority"]').selectOption('HIGH');
    await page.locator('input[name="location"]').fill('Plant 1');
    await page.locator('input[name="startDate"]').fill('2026-02-10');
    await page.locator('select[name="scheduleType"]').selectOption('TIME_BASED');
    await page.locator('select[name="intervalUnit"]').selectOption('DAYS');
    await page.locator('input[name="intervalValue"]').fill('30');
    await page.locator('input[name="leadTimeDays"]').fill('5');

    await page.getByRole('button', { name: /Create PM Template/i }).click();

    expect(postPayload.assetId).toBe(1);
    expect(postPayload.title).toBe('Quarterly Pump Check');
    expect(postPayload.priority).toBe('HIGH');
    expect(postPayload.scheduleType).toBe('TIME_BASED');
    expect(postPayload.intervalUnit).toBe('DAYS');
    expect(postPayload.intervalValue).toBe(30);
    expect(postPayload.leadTimeDays).toBe(5);

    await expect(page).toHaveURL(/\/maintenance\/preventive$/, { timeout: 10000 });
  });

  test('edits a preventive maintenance template', async ({ page }) => {
    await mockAssetsAndTypes(page);
    await mockPmList(page); // Mock list for redirect after edit

    await page.route('**/api/maintenance/preventive/77', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 77,
              assetId: 2,
              title: 'Monthly Check',
              priority: 'MEDIUM',
              scheduleType: 'TIME_BASED',
              intervalUnit: 'WEEKS',
              intervalValue: 4,
              leadTimeDays: 2,
              startDate: '2026-02-01T00:00:00Z',
              applyTo: 'ASSET'
            }
          })
        });
        return;
      }
      if (method === 'PATCH' || method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 77 } })
        });
        return;
      }
      await route.continue();
    });

    let patchPayload: PreventiveMaintenancePayload = {};
    page.on('request', (req: Request) => {
      if ((req.method() === 'PATCH' || req.method() === 'PUT') && req.url().includes('/api/maintenance/preventive/77')) {
        patchPayload = JSON.parse(req.postData() || '{}') as PreventiveMaintenancePayload;
      }
    });

    await page.goto('/preventive-maintenance/edit/77');
    
    // Wait for form to load
    await page.locator('input[name="title"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[name="title"]').fill('Monthly Check Updated');
    
    const updateButton = page.getByRole('button', { name: /Update PM Template/i });
    await updateButton.waitFor({ state: 'visible' });
    await updateButton.click();

    expect(patchPayload.title).toBe('Monthly Check Updated');
    expect(patchPayload.intervalUnit).toBe('WEEKS');
    await expect(page).toHaveURL(/\/maintenance\/preventive$/, { timeout: 10000 });
  });

  test('deletes a preventive maintenance template from listing', async ({ page }) => {
    await mockPmList(page);
    let deleteCalled = false;
    await page.route('**/api/maintenance/preventive/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/maintenance/preventive');
    await page.waitForTimeout(200);

    // Wait for delete button to be visible
    const deleteButton = page.getByLabel('Delete template').first();
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteButton.click();
    
    // Wait for modal to appear
    await page.locator('.modal .deleteBtn').waitFor({ state: 'visible' });
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
