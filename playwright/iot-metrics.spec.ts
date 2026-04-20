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
    const url = route.request().url();
    if (url.includes('/api/iot/metrics')) {
      await route.fallback();
      return;
    }

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

test.describe('IoT Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await silenceOtherApiGets(page);
  });

  test('renders list rows and supports search filter', async ({ page }) => {
    await page.route('**/api/iot/metrics**', async (route) => {
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
              { id: 1, metricCode: '234234456747', metricName: 'test', unit: 'werew567', active: true, updatedAt: '2026-04-07T12:39:00.000Z' },
              { id: 2, metricCode: '234234', metricName: 'test', unit: 'werew', active: true, updatedAt: '2026-04-07T07:23:00.000Z' },
              { id: 3, metricCode: '23476', metricName: 'Temp', unit: 'c', active: true, updatedAt: '2026-04-08T15:27:00.000Z' }
            ],
            totalElements: 3,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.goto('/iot/metrics');

    await expect(page.getByRole('heading', { name: 'IoT Metrics' })).toBeVisible();
    await expect(page.getByText('(3 total)')).toBeVisible();
    await expect(page.getByText('234234456747')).toBeVisible();
    await expect(page.getByText('werew567')).toBeVisible();
    await expect(page.getByText('Temp')).toBeVisible();

    await page.getByPlaceholder('Search by code or name').fill('Temp');
    await expect(page.getByText('23476')).toBeVisible();
    await expect(page.getByText('234234456747')).toHaveCount(0);
  });

  test('refresh reloads metrics data', async ({ page }) => {
    let requestCount = 0;
    let rows = [
      { id: 1, metricCode: 'M-1', metricName: 'Metric One', unit: 'psi', active: true, updatedAt: '2026-04-07T12:39:00.000Z' }
    ];

    await page.route('**/api/iot/metrics**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      requestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: rows,
            totalElements: rows.length,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.goto('/iot/metrics');
    await expect(page.getByText('Metric One')).toBeVisible();

    rows = [
      { id: 2, metricCode: 'M-2', metricName: 'Metric Two', unit: 'bar', active: true, updatedAt: '2026-04-08T12:39:00.000Z' }
    ];

    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect(page.getByText('Metric Two')).toBeVisible();
    await expect.poll(() => requestCount).toBeGreaterThan(1);
  });

  test('navigates to create, view, and edit pages', async ({ page }) => {
    await page.route('**/api/iot/metrics**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [{ id: 9, metricCode: 'CODE9', metricName: 'Metric 9', unit: 'kWh', active: true }],
            totalElements: 1,
            size: 10,
            page: 0
          }
        })
      });
    });

    await page.goto('/iot/metrics');
    await page.getByRole('button', { name: '+ Create Metric' }).click();
    await expect(page).toHaveURL(/\/iot\/metrics\/create$/);

    await page.goto('/iot/metrics');
    await page.getByLabel('View IoT metric').first().click();
    await expect(page).toHaveURL(/\/iot\/metrics\/view\/9$/);

    await page.goto('/iot/metrics');
    await page.getByLabel('Edit IoT metric').first().click();
    await expect(page).toHaveURL(/\/iot\/metrics\/edit\/9$/);
  });

  test('creates metric and validates required fields', async ({ page }) => {
    let createPayload: Record<string, unknown> = {};

    await page.route('**/api/iot/metrics', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      createPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 101, metricCode: 'TEMP01' } })
      });
    });

    await page.route('**/api/iot/metrics**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { content: [], totalElements: 0, size: 10, page: 0 }
        })
      });
    });

    await page.goto('/iot/metrics/create');

    await page.getByRole('button', { name: 'Create Metric' }).click();
    await expect(page.getByText('Metric code is required.')).toBeVisible();

    await page.locator('input[name="metricCode"]').fill('TEMP01');
    await page.getByRole('button', { name: 'Create Metric' }).click();
    await expect(page.getByText('Metric name is required.')).toBeVisible();

    await page.locator('input[name="metricName"]').fill('Temperature');
    await page.locator('input[name="unit"]').fill('Celsius');
    await page.locator('textarea[name="description"]').fill('Primary temperature metric');
    await page.getByRole('button', { name: 'Create Metric' }).click();

    expect(createPayload).toMatchObject({
      metricCode: 'TEMP01',
      metricName: 'Temperature',
      unit: 'Celsius',
      description: 'Primary temperature metric',
      active: true
    });
    await expect(page).toHaveURL(/\/iot\/metrics$/);
  });

  test('close button navigates back to metrics list', async ({ page }) => {
    await page.goto('/iot/metrics/create');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/iot\/metrics$/);
  });
});
