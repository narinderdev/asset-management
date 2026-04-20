import { expect, test, type Page } from '@playwright/test';

test.use({ storageState: null });

const seedSession = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({
        modules: {
          WORK_ORDER: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          INVENTORY: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          WAREHOUSE: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          PROCUREMENT: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          VENDOR: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          SERVICE_REQUEST: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TECHNICIAN: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TECHNICIAN_TEAM: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          ROLES: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          USERS: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TM_SYSTEM: ['VIEW', 'CREATE', 'UPDATE', 'DELETE']
        }
      })
    );
    localStorage.setItem('currentUser', JSON.stringify({ firstName: 'Playwright', lastName: 'User' }));
  });
};

const mockApiGetCalls = async (page: Page) => {
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

const openIotMonitoringMenu = async (page: Page) => {
  const iotMonitoringLink = page
    .locator('.menu-link')
    .filter({ has: page.locator('.menu-label', { hasText: /^IoT Monitoring$/ }) });
  await expect(iotMonitoringLink).toBeVisible();
  await iotMonitoringLink.click();
};

test.describe('IoT Monitoring sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockApiGetCalls(page);
    await page.goto('/dashboard');
  });

  test('shows IoT Monitoring submenu entries', async ({ page }) => {
    await openIotMonitoringMenu(page);

    await expect(page.getByRole('link', { name: /^Devices$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Alerts$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Rules$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Metrics$/ })).toBeVisible();
  });

  test('navigates to IoT Devices from sidebar', async ({ page }) => {
    await openIotMonitoringMenu(page);
    await page.getByRole('link', { name: /^Devices$/ }).click();

    await expect(page).toHaveURL(/\/iot\/devices$/);
    await expect(page.getByRole('heading', { name: 'IoT Device Management' })).toBeVisible();
  });

  test('navigates to IoT Alerts from sidebar', async ({ page }) => {
    await openIotMonitoringMenu(page);
    await page.getByRole('link', { name: /^Alerts$/ }).click();

    await expect(page).toHaveURL(/\/iot\/alerts$/);
    await expect(page.getByRole('heading', { name: 'IoT Alerts' })).toBeVisible();
  });

  test('navigates to IoT Rules from sidebar', async ({ page }) => {
    await openIotMonitoringMenu(page);
    await page.getByRole('link', { name: /^Rules$/ }).click();

    await expect(page).toHaveURL(/\/iot\/rules$/);
    await expect(page.getByRole('heading', { name: 'IoT Rules' })).toBeVisible();
  });

  test('navigates to IoT Metrics from sidebar', async ({ page }) => {
    await openIotMonitoringMenu(page);
    await page.getByRole('link', { name: /^Metrics$/ }).click();

    await expect(page).toHaveURL(/\/iot\/metrics$/);
    await expect(page.getByRole('heading', { name: 'IoT Metrics' })).toBeVisible();
  });
});
