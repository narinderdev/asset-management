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

const mockIotDeviceApis = async (page: Page) => {
  await page.route('**/api/iot/devices**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 1,
                deviceUid: '435435',
                deviceName: 'cvbcvbsss',
                assetName: 'dfg',
                location: 'VALLEJO',
                enabled: true
              },
              {
                id: 2,
                deviceUid: '2345454',
                deviceName: 'Lahoretanks',
                assetName: 'new',
                location: '',
                enabled: true
              }
            ],
            totalElements: 2,
            size: 10,
            page: 0
          }
        })
      });
      return;
    }

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 101,
            deviceUid: 'DEV-101',
            deviceName: 'Boiler Sensor'
          }
        })
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/assets**', async (route) => {
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
            { id: 10, assetName: 'Boiler A', location: { primaryLocation: 'Plant A' } },
            { id: 11, assetName: 'Pump B', location: 'Plant B' }
          ]
        }
      })
    });
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

test.describe('IoT Devices', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await silenceOtherApiGets(page);
    await mockIotDeviceApis(page);
  });

  test('shows device list and supports refresh', async ({ page }) => {
    let listCallCount = 0;
    page.on('request', (req: Request) => {
      if (req.method() === 'GET' && /\/api\/iot\/devices(\?|$)/.test(req.url())) {
        listCallCount += 1;
      }
    });

    await page.goto('/iot/devices');

    await expect(page.getByRole('heading', { name: 'IoT Device Management' })).toBeVisible();
    await expect(page.getByText('435435')).toBeVisible();
    await expect(page.getByText('cvbcvbsss')).toBeVisible();
    await expect(page.getByText('VALLEJO')).toBeVisible();
    await expect(page.getByText('Authorized')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(() => listCallCount).toBeGreaterThan(1);
  });

  test('navigates to view and edit from row actions', async ({ page }) => {
    await page.goto('/iot/devices');

    await page.getByLabel('View device').first().click();
    await expect(page).toHaveURL(/\/iot\/devices\/view\/1$/);

    await page.goto('/iot/devices');
    await page.getByLabel('Edit device').first().click();
    await expect(page).toHaveURL(/\/iot\/devices\/edit\/1$/);
  });

  test('creates a device from create page', async ({ page }) => {
    let createPayload: Record<string, unknown> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'POST' && /\/api\/iot\/devices$/.test(req.url())) {
        createPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/iot/devices');
    await page.getByRole('button', { name: '+ Add Device' }).click();
    await expect(page).toHaveURL(/\/iot\/devices\/create$/);

    await page.locator('input[name="deviceUid"]').fill('DEV-101');
    await page.locator('input[name="deviceName"]').fill('Boiler Sensor');
    await page.locator('select[name="assetId"]').selectOption('10');

    await expect(page.locator('input[name="location"]')).toHaveValue('Plant A');

    await page.getByRole('button', { name: 'Create Device' }).click();

    expect(createPayload).toMatchObject({
      deviceUid: 'DEV-101',
      deviceName: 'Boiler Sensor',
      assetId: 10,
      location: 'Plant A',
      enabled: true
    });
    await expect(page).toHaveURL(/\/iot\/devices$/);
  });

  test('validates required fields and supports close navigation', async ({ page }) => {
    await page.goto('/iot/devices/create');

    await page.getByRole('button', { name: 'Create Device' }).click();
    await expect(page.getByText('Device name is required.')).toBeVisible();

    await page.locator('input[name="deviceName"]').fill('Temp Sensor');
    await page.getByRole('button', { name: 'Create Device' }).click();
    await expect(page.getByText('Device UID is required.')).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/iot\/devices$/);
  });
});
