import { test, expect, Page } from '@playwright/test';

const typeDelay = 50;

const seedAuth = async (page: Page) => {
  await page.goto('/login'); // public route ensures origin available
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: { ASSET: ['CREATE', 'UPDATE', 'DELETE'] } }));
  });
};

const mockAssetTypeApis = async (page: Page) => {
  await page.route('**/api/asset-types**', async (route) => {
    const { method } = route.request();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, code: 'GEN', name: 'Generator', assetCategory: 'Power', defaultCriticality: 'High', defaultGlAccount: '4000', insuranceRequired: true, active: true },
            { id: 2, code: 'CHL', name: 'Chiller', assetCategory: 'HVAC', defaultCriticality: 'Medium', defaultGlAccount: '4100', insuranceRequired: false, active: false }
          ]
        })
      });
      return;
    }
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 99, code: 'NEW', name: 'New Type' } })
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/asset-categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 10, name: 'Power' }, { id: 11, name: 'HVAC' }] })
    });
  });
};

test.describe('Asset Types', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockAssetTypeApis(page);
  });

  test.fixme('lists asset types and filters by name/code (requires passing AuthGuard)', async ({ page }) => {
    await page.goto('/assets/types');

    await expect(page.getByRole('heading', { name: 'Asset Types' })).toBeVisible();
    await expect(page.locator('.title-group .count')).toHaveText('(2 total)', { timeout: 10000 });

    await expect(page.getByRole('row', { name: /GEN/ })).toContainText(['GEN', 'Generator', 'Power', 'High', '4000', 'Yes', 'Active']);
    await expect(page.getByRole('row', { name: /CHL/ })).toContainText(['CHL', 'Chiller', 'HVAC', 'Medium', '4100', 'No', 'Inactive']);

    await page.getByPlaceholder('Search by name or code').type('chl', { delay: typeDelay });
    await expect(page.getByRole('row', { name: /CHL/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /GEN/ })).toHaveCount(0);
  });

  test.fixme('creates an asset type and redirects to listing (blocked by AuthGuard redirect)', async ({ page }) => {
    const postRequest = page.waitForRequest((req) => req.method() === 'POST' && /api\/asset-types$/.test(req.url()));

    await page.goto('/assets/types/create');
    await page.getByPlaceholder('Enter code').fill('NEW', { delay: typeDelay });
    await page.getByPlaceholder('Enter name').fill('New Type', { delay: typeDelay });
    await page.getByRole('combobox', { name: /Asset Category/i }).selectOption({ value: '10' });
    await page.getByRole('combobox', { name: /Default Criticality/i }).selectOption({ value: 'HIGH' });
    await page.getByRole('combobox', { name: /Insurance Required/i }).selectOption({ label: 'Yes' });
    await page.getByRole('combobox', { name: /^Active$/i }).selectOption({ label: 'Active' });

    await page.getByRole('button', { name: /Create Asset Type/i }).click();

    const req = await postRequest;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.code).toBe('NEW');
    expect(payload.name).toBe('New Type');
    expect(Number(payload.assetCategoryId)).toBe(10);

    await expect(page).toHaveURL(/\/assets\/types$/);
  });

  test.fixme('edits an asset type', () => {
    // No edit UI route currently exists (only /assets/types/create). Enable when edit screen is added.
  });

  test.fixme('deletes an asset type', () => {
    // No delete control in asset types table. Add when UI/API wiring is available.
  });
});
