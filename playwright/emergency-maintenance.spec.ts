import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { PREVENTIVE_MAINTENANCE: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } }));
  });

const mockEmergencyList = async (page: Page) => {
  await page.route('**/api/maintenance/emergency**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          incidents: [
            { id: 1, failureDescription: 'Motor burned', assetName: 'Pump A', location: 'Bay 1', failureTime: '2026-01-28T10:00:00Z', workOrder: { priority: 'HIGH' } },
            { id: 2, failureDescription: 'Overheat alarm', assetName: 'Boiler B', location: 'Plant 2', failureTime: '2026-01-27T12:00:00Z', workOrder: { priority: 'LOW' } }
          ],
          totalElements: 2,
          size: 10,
          page: 0
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
        data: { content: [{ id: 1, assetName: 'Pump A' }, { id: 2, assetName: 'Boiler B' }] }
      })
    });
  });
};

const mockTechniciansTeamsInventory = async (page: Page) => {
  await page.route('**/api/technicians**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          technicians: [
            { id: 10, fullName: 'Alex Tech' },
            { id: 11, fullName: 'Jamie Fix' }
          ]
        }
      })
    });
  });

  await page.route('**/api/technician-teams**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          teams: [
            { id: 20, teamName: 'Team Alpha' },
            { id: 21, teamName: 'Team Beta' }
          ]
        }
      })
    });
  });

  await page.route('**/api/inventory**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [
            { id: 100, itemName: 'Bearing', itemId: 'BRG-1' },
            { id: 101, itemName: 'Seal', itemId: 'SEAL-2' }
          ]
        }
      })
    });
  });
};

test.describe('Emergency Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists emergency incidents', async ({ page }) => {
    await mockEmergencyList(page);
    await page.goto('/maintenance/emergency');

    await expect(page.getByRole('heading', { name: /Emergency Maintenance/i })).toBeVisible();
    await expect(page.getByText('Motor burned')).toBeVisible();
    await expect(page.getByText('Pump A')).toBeVisible();
    await expect(page.getByText('Overheat alarm')).toBeVisible();
    await expect(page.getByText('Boiler B')).toBeVisible();
  });

  test('creates an emergency maintenance incident', async ({ page }) => {
    await mockAssets(page);
    await mockTechniciansTeamsInventory(page);

    let postPayload: Record<string, unknown> = {};
    await page.route('**/api/maintenance/emergency', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 300 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/emergency-maintenance/create');

    await page.locator('select[name="assetId"]').selectOption({ label: 'Pump A' });
    await page.locator('input[name="location"]').fill('Line 1');
    await page.locator('input[name="failureDescription"]').fill('Seal failure');
    await page.locator('input[name="failureTime"]').fill('2026-01-28T12:30');
    await page.locator('input[name="reporter"]').fill('Dana');
    await page.locator('input[name="sendNotification"]').check();

    // Assignment
    await page.getByLabel('Technician', { exact: true }).check();
    await page.locator('select[name="assignedTechnicianId"]').selectOption({ label: 'Alex Tech' });
    await page.locator('input[name="plannedStartDateTime"]').fill('2026-01-28T13:00');
    await page.locator('input[name="plannedEndDateTime"]').fill('2026-01-28T15:00');
    await page.locator('input[name="planner"]').fill('Planner A');
    await page.locator('textarea[name="preCheckNotes"]').fill('Check PPE');

    // Materials
    // Planned materials are not available until the async inventory list renders; wait for the select to be ready.
    const materialSelect = page.locator('select[name="material-0"]');
    await materialSelect.waitFor({ state: 'visible' });
    await materialSelect.selectOption({ label: 'Bearing' });
    await page.locator('input[name="qty-0"]').fill('2');
    await page.locator('input[name="notes-0"]').fill('Replace both');

    await page.getByRole('button', { name: /Save Emergency Maintenance/i }).click();

    expect(postPayload.assetId).toBe(1);
    expect(postPayload.failureDescription).toBe('Seal failure');
    expect(postPayload.failureTime).toContain('2026-01-28T12:30');
    expect(postPayload.assignedTechnicianId).toBe(10);
    expect(postPayload.plannedMaterials?.[0]?.inventoryItemId).toBe(100);
    expect(postPayload.plannedMaterials?.[0]?.quantity).toBe(2);
    expect(postPayload.preCheckNotes).toBe('Check PPE');

    await expect(page).toHaveURL(/\/maintenance\/emergency$/);
  });

  test('edits an emergency incident', async ({ page }) => {
    await mockAssets(page);
    await mockTechniciansTeamsInventory(page);

    await page.route('**/api/maintenance/emergency/42', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 42,
              assetId: 2,
              location: 'Bay 2',
              failureDescription: 'Overheat',
              failureTime: '2026-01-28T10:00',
              reporter: 'Chris',
              workOrder: {
                assignedTechnicianId: 11,
                plannedStartDateTime: '2026-01-28T11:00',
                plannedEndDateTime: '2026-01-28T12:00',
                planner: 'Planner B',
                preCheckNotes: 'Check coolant'
              }
            }
          })
        });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 42 } })
        });
        return;
      }
      await route.continue();
    });

    let postPayload: Record<string, unknown> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'POST' && req.url().includes('/api/maintenance/emergency')) {
        postPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/emergency-maintenance/edit/42');
    await page.locator('input[name="failureDescription"]').fill('Overheat updated');
    await page.getByRole('button', { name: /Save Emergency Maintenance|Update Emergency/i }).click();

    expect(postPayload.failureDescription).toBe('Overheat updated');
    await expect(page).toHaveURL(/\/maintenance\/emergency$/);
  });

  test('deletes an emergency incident from listing', async ({ page }) => {
    await mockEmergencyList(page);
    let deleteCalled = false;
    await page.route('**/api/maintenance/emergency/1', async (route) => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/maintenance/emergency');
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: '+ Create Emergency Maintenance' }).waitFor({ state: 'visible' });
    await page.getByLabel('Delete template').first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
