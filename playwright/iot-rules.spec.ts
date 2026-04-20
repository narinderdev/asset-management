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

const mockIotRulesApis = async (page: Page) => {
  let rules = [
    {
      id: 1,
      assetId: 10,
      assetName: 'mad',
      metricCode: 'test',
      metricName: 'test',
      ruleOperator: 'BELOW',
      criticalThreshold: 546,
      active: true,
      updatedAt: '2026-04-07T12:57:00.000Z'
    }
  ];

  await page.route('**/api/iot/rules**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: rules,
          totalElements: rules.length,
          size: 10,
          page: 0
        }
      })
    });
  });

  await page.route('**/api/iot/rules/*', async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === 'DELETE') {
      rules = [];
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: rules[0] ?? null })
      });
      return;
    }

    await route.fallback();
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

test.describe('IoT Rules', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockIotRulesApis(page);
    await silenceOtherApiGets(page);
  });

  test('renders rules list with row data', async ({ page }) => {
    await page.goto('/iot/rules');

    await expect(page.getByRole('heading', { name: 'IoT Rules' })).toBeVisible();
    await expect(page.getByText('(1 total)')).toBeVisible();
    await expect(page.getByText('mad')).toBeVisible();
    await expect(page.getByText('test')).toBeVisible();
    await expect(page.getByText('BELOW')).toBeVisible();
    await expect(page.getByText('546')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('filters rules from search input', async ({ page }) => {
    await page.goto('/iot/rules');

    await page.getByPlaceholder('Search by asset or metric').fill('mad');
    await expect(page.getByText('mad')).toBeVisible();

    await page.getByPlaceholder('Search by asset or metric').fill('xyz-not-found');
    await expect(page.getByText('No IoT rules found.')).toBeVisible();
  });

  test('navigates to create, view and edit pages', async ({ page }) => {
    await page.goto('/iot/rules');

    await page.getByRole('button', { name: '+ Create Rule' }).click();
    await expect(page).toHaveURL(/\/iot\/rules\/create$/);

    await page.goto('/iot/rules');
    await page.getByLabel('View IoT rule').first().click();
    await expect(page).toHaveURL(/\/iot\/rules\/view\/1$/);

    await page.goto('/iot/rules');
    await page.getByLabel('Edit IoT rule').first().click();
    await expect(page).toHaveURL(/\/iot\/rules\/edit\/1$/);
  });

  test('deletes a rule after confirmation', async ({ page }) => {
    let deleteCalled = false;
    page.on('request', (req: Request) => {
      if (req.method() === 'DELETE' && /\/api\/iot\/rules\/1/.test(req.url())) {
        deleteCalled = true;
      }
    });
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/iot/rules');
    await page.getByLabel('Delete IoT rule').first().click();

    await expect.poll(() => deleteCalled).toBe(true);
    await expect(page.getByText('No IoT rules found.')).toBeVisible();
  });
});
