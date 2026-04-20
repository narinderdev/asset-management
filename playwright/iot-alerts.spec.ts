import { expect, test, type Page, type Request } from '@playwright/test';

test.use({ storageState: null });

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({
        modules: {
          WORK_ORDER: ['VIEW'],
          INVENTORY: ['VIEW'],
          SERVICE_REQUEST: ['VIEW'],
          TM_SYSTEM: ['VIEW']
        }
      })
    );
    localStorage.setItem('currentUser', JSON.stringify({ firstName: 'Playwright', lastName: 'User' }));
  });
};

const silenceOtherApiGets = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} })
      });
      return;
    }
    await route.fallback();
  });
};

test.describe('IoT Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await silenceOtherApiGets(page);
  });

  test('shows empty state and total count', async ({ page }) => {
    await page.route('**/api/iot/alerts**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [],
            totalElements: 0,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.goto('/iot/alerts');

    await expect(page.getByRole('heading', { name: 'IoT Alerts' })).toBeVisible();
    await expect(page.getByText('(0 total)')).toBeVisible();
    await expect(page.getByText('No IoT alerts found.')).toBeVisible();
  });

  test('refresh reloads the alerts table', async ({ page }) => {
    let fetchCount = 0;
    let alertsContent = [
      {
        id: 11,
        severity: 'HIGH',
        status: 'ACTIVE',
        assetName: 'Boiler A',
        location: 'Plant A',
        message: 'Temperature too high',
        createdAt: '2026-04-07T12:39:00.000Z'
      }
    ];

    await page.route('**/api/iot/alerts**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      fetchCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: alertsContent,
            totalElements: alertsContent.length,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.goto('/iot/alerts');
    await expect(page.getByText('Temperature too high')).toBeVisible();

    alertsContent = [
      {
        id: 12,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        assetName: 'Pump B',
        location: 'Plant B',
        message: 'Pressure drop detected',
        createdAt: '2026-04-08T12:39:00.000Z'
      }
    ];

    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.getByText('Pressure drop detected')).toBeVisible();
    await expect.poll(() => fetchCount).toBeGreaterThan(1);
  });

  test('acknowledges an active alert', async ({ page }) => {
    let ackPayload: Record<string, unknown> = {};

    await page.route('**/api/iot/alerts**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 21,
                severity: 'HIGH',
                status: 'ACTIVE',
                assetName: 'Compressor A',
                location: 'Line 2',
                message: 'Vibration threshold exceeded',
                createdAt: '2026-04-07T12:39:00.000Z'
              }
            ],
            totalElements: 1,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.route('**/api/iot/alerts/21/ack', async (route) => {
      ackPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 21, status: 'ACKNOWLEDGED' } })
      });
    });

    await page.goto('/iot/alerts');
    await page.getByRole('button', { name: 'Ack' }).first().click();

    await expect(page.getByRole('heading', { name: 'Acknowledge Alert' })).toBeVisible();
    await page.getByRole('button', { name: 'Acknowledge' }).click();

    expect(ackPayload).toEqual({ reason: 'Acknowledged from web UI' });
  });

  test('suppresses an active alert with selected datetime', async ({ page }) => {
    let suppressPayload: Record<string, unknown> = {};

    await page.route('**/api/iot/alerts**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 31,
                severity: 'MEDIUM',
                status: 'ACTIVE',
                assetName: 'Cooling Unit',
                location: 'Plant C',
                message: 'Abnormal readings',
                createdAt: '2026-04-07T12:39:00.000Z'
              }
            ],
            totalElements: 1,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.route('**/api/iot/alerts/31/suppress', async (route) => {
      suppressPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 31, status: 'SUPPRESSED' } })
      });
    });

    await page.goto('/iot/alerts');
    await page.getByRole('button', { name: 'Suppress' }).first().click();

    await expect(page.getByRole('heading', { name: 'Suppress Alert' })).toBeVisible();
    await page.locator('textarea[placeholder="Enter reason"]').fill('Maintenance window');
    await page.locator('input[type="datetime-local"]').fill('2026-04-10T09:30');
    await page.getByRole('button', { name: 'Suppress' }).click();

    expect(suppressPayload.reason).toBe('Maintenance window');
    expect(typeof suppressPayload.suppressedUntil).toBe('string');
  });
});
