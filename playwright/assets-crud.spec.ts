import { test, expect, Page, Request } from '@playwright/test';

const typeDelay = 60;

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { ASSET: ['CREATE', 'UPDATE', 'DELETE'] } })
    );
  });

const mockReferenceData = async (page: Page) => {
  await page.route('**/api/asset-types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'Generator' }, { id: 2, name: 'Chiller' }] })
    });
  });

  await page.route('**/api/asset-categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 11, name: 'HVAC' }, { id: 12, name: 'Power' }] })
    });
  });

  await page.route('**/api/technician-teams**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { teams: [{ id: 1, teamName: 'Team A' }] } })
    });
  });
};

test.describe('Asset create/edit/view/delete', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockReferenceData(page);
  });

  test('creates an asset from Asset Master tab and navigates to location tab', async ({ page }) => {
    const createRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && /api\/assets$/.test(req.url())
    );

    await page.route('**/api/assets', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 999, assetId: 'AST-999', assetName: 'New Pump' } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/assets/add-asset');
    await page.getByRole('heading', { name: /Add New Asset|Edit Asset/i }).waitFor();

    await page.getByPlaceholder('Enter Asset ID').fill('AST-999', { delay: typeDelay });
    await page.getByPlaceholder('Enter Asset Name').fill('New Pump', { delay: typeDelay });
    await page.getByPlaceholder('Enter or select Asset Category').fill('HVAC', { delay: typeDelay });
    await page.locator('select.form-select').nth(1).selectOption('IN_SERVICE');

    await page.getByRole('button', { name: 'Save' }).click();

    const request = await createRequest;
    const payload = JSON.parse(request.postData() || '{}');
    expect(payload.assetName).toBe('New Pump');
    expect(payload.assetCategory).toBe('HVAC');
    expect(payload.status).toBe('IN_SERVICE');

    await expect(page).toHaveURL(/assets\/add-asset\/location-organization\?id=999/);
  });

  test.fixme('edits an existing asset from final tab and sends update', async ({ page }) => {
    await page.route('**/api/assets/101', async (route) => {
      const { method } = route.request();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 101,
              assetId: 'AST-101',
              assetName: 'Existing Pump',
              assetCategory: 'HVAC',
              status: 'IN_SERVICE',
              safetyOperations: { safetyCritical: false, safetyNotes: 'Old note', operatingInstructions: '' }
            }
          })
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 101 } }) });
        return;
      }
      await route.continue();
    });

    const updateRequest = page.waitForRequest(
      (req) => req.method() === 'PATCH' && /api\/assets\/101$/.test(req.url())
    );

    await page.goto('/assets/add-asset/asset-master?id=101');
    await page.waitForResponse((res) => res.url().includes('/api/assets/101') && res.request().method() === 'GET');
    await page.locator('.loading-overlay').first().waitFor({ state: 'hidden' });

    await page.locator('#mobile-tab-select').selectOption('safety-operations');
    await page.getByPlaceholder('Enter Safety Notes').waitFor({ state: 'visible' });
    await page.getByPlaceholder('Enter Safety Notes').fill('Updated safety note', { delay: typeDelay });
    await page.getByRole('button', { name: 'Update' }).click();

    const patchReq = await updateRequest;
    const body = JSON.parse(patchReq.postData() || '{}');
    expect(body.basic.assetName).toBe('Existing Pump');
    expect(body.safetyOperations?.safetyNotes).toBe('Updated safety note');
  });

  test('views asset details page', async ({ page }) => {
    await page.route('**/api/assets/202', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 202,
            assetId: 'AST-202',
            assetName: 'Viewable Asset',
            assetCategory: 'Power',
            assetType: 'Generator',
            status: 'IN_SERVICE',
            ownership: 'Owned',
            shortDescription: 'Backup generator',
            location: { primaryLocation: 'Plant 1' }
          }
        })
      });
    });

    await page.goto('/assets/view/202');

    await expect(page.getByRole('heading', { name: /Viewable Asset/i })).toBeVisible();
    await expect(page.locator('.mr-id')).toHaveText('AST-202');
    await expect(page.getByText('Power')).toBeVisible();
    await expect(page.locator('.field-group').filter({ has: page.getByText('Type') }).locator('.field-value')).toHaveText('Generator');
    await expect(page.getByText('Plant 1')).toBeVisible();
  });

  test.fixme('deletes an asset from list page', async ({ page }) => {
    await page.route('**/api/assets**', async (route) => {
      const { method, url } = route.request();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              totalElements: 1,
              size: 10,
              number: 0,
              content: [{ id: 55, assetId: 'AST-55', assetName: 'Delete Me', assetCategory: 'HVAC', status: 'ACTIVE' }]
            }
          })
        });
        return;
      }
      if (method === 'DELETE' && /\/api\/assets\/55$/.test(url)) {
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto('/assets');
    await page.waitForResponse((res) => res.url().includes('/api/assets') && res.request().method() === 'GET');
    await page.locator('.loading-overlay').first().waitFor({ state: 'hidden' });
    await page.locator('table.assets-table tbody tr').first().waitFor({ state: 'visible' });
    await page.getByLabel('Delete asset').first().click();

    const deleteRequest = page.waitForRequest((req: Request) => req.method() === 'DELETE' && /api\/assets\/55$/.test(req.url()));
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleteRequest;

    await expect(page.getByText('No assets to display.')).toBeVisible();
  });
});
