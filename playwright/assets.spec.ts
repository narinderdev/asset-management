import { test, expect, Page, Request } from '@playwright/test';

const typeDelay = 80;

type ApiAsset = {
  id?: number;
  assetId?: string;
  assetName?: string;
  assetCategory?: string;
  assetType?: string;
  status?: string;
  location?: string | { primaryLocation?: string };
  warrantyLifecycle?: { lastMaintenanceDate?: string; warrantyEnd?: string };
  financialDetails?: { acquisitionDate?: string };
};

const primeAuthAndPermissions = (page: Page, modules: Record<string, string[]> = { ASSET: ['CREATE', 'UPDATE', 'DELETE'] }) =>
  page.addInitScript(({ modules }) => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('currentUser', JSON.stringify({ firstName: 'Playwright', lastName: 'User' }));
    localStorage.setItem('userPermissions', JSON.stringify({ modules }));
  }, { modules });

const mockAssetsApi = async (page: Page, seed: ApiAsset[]) => {
  let assets = [...seed];

  await page.route('**/api/assets**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, 'http://localhost');

    if (method === 'GET') {
      const pageParam = Number(parsed.searchParams.get('page') ?? '0');
      const sizeParam = Number(parsed.searchParams.get('size') ?? '10');
      const start = pageParam * sizeParam;
      const content = assets.slice(start, start + sizeParam);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          data: {
            totalElements: assets.length,
            size: sizeParam,
            number: pageParam,
            content
          }
        })
      });
      return;
    }

    if (method === 'DELETE') {
      const id = parsed.pathname.split('/').pop();
      assets = assets.filter((a) => String(a.id) !== id);
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
      return;
    }

    await route.continue();
  });

  return {
    get assets() {
      return assets;
    },
    set assets(next: ApiAsset[]) {
      assets = next;
    }
  };
};

test.describe('Assets module', () => {
  test.beforeEach(async ({ page }) => {
    await primeAuthAndPermissions(page);
  });

  test('lists assets with normalized fields and counts', async ({ page }) => {
    await mockAssetsApi(page, [
      {
        id: 1,
        assetId: 'AST-001',
        assetName: 'Boiler',
        assetCategory: 'Heating',
        status: 'ACTIVE',
        location: { primaryLocation: 'Plant 1' },
        warrantyLifecycle: { lastMaintenanceDate: '2024-12-01', warrantyEnd: '2026-12-01' }
      },
      {
        id: 2,
        assetId: 'AST-002',
        assetName: 'Pump Station',
        assetCategory: 'Pumps',
        status: 'UNDER_MAINTENANCE',
        location: 'Building B',
        financialDetails: { acquisitionDate: '2024-01-15' },
        warrantyLifecycle: { warrantyEnd: '2027-01-15' }
      },
      {
        id: 3,
        assetId: 'AST-003',
        assetName: 'Old Conveyor',
        assetCategory: 'Production',
        status: 'RETIRED',
        location: 'Yard'
      }
    ]);

    await page.goto('/assets');
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();

    await expect(page.locator('.assets-count')).toHaveText(/\(Showing 1 - 3 of 3\)/);
    await expect(page.locator('.pager-info').first()).toHaveText('Showing 1 - 3 of 3');

    const boilerRow = page.getByRole('row', { name: /Boiler/i });
    await expect(boilerRow.getByText('AST-001')).toBeVisible();
    await expect(boilerRow.getByText('Boiler')).toBeVisible();
    await expect(boilerRow.getByText('Plant 1')).toBeVisible();
    await expect(boilerRow.getByText('Active')).toBeVisible();

    const pumpRow = page.getByRole('row', { name: /Pump Station/i });
    await expect(pumpRow.getByText('AST-002')).toBeVisible();
    await expect(pumpRow.getByText('Pump Station')).toBeVisible();
    await expect(pumpRow.getByText('Building B')).toBeVisible();
    await expect(pumpRow.getByText('In Repair')).toBeVisible();

    const retiredRow = page.getByRole('row', { name: /Old Conveyor/i });
    await expect(retiredRow.getByText('AST-003')).toBeVisible();
    await expect(retiredRow.getByText('Old Conveyor')).toBeVisible();
    await expect(retiredRow.getByText('Yard')).toBeVisible();
    await expect(retiredRow.getByText('Retried')).toBeVisible();
  });

  test('filters assets by name with search box', async ({ page }) => {
    await mockAssetsApi(page, [
      { id: 1, assetId: 'A-1', assetName: 'Generator', assetCategory: 'Power', status: 'ACTIVE', location: 'East' },
      { id: 2, assetId: 'A-2', assetName: 'Chiller', assetCategory: 'HVAC', status: 'ACTIVE', location: 'West' }
    ]);

    await page.goto('/assets');
    await page.getByPlaceholder('Asset Name').type('gen', { delay: typeDelay });
    await page.getByRole('button', { name: /Search/i }).click();

    await expect(page.getByRole('row', { name: /Generator/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /Chiller/i })).toHaveCount(0);
  });

  test('paginates between pages and updates counters', async ({ page }) => {
    const bigList: ApiAsset[] = Array.from({ length: 15 }).map((_, idx) => ({
      id: idx + 1,
      assetId: `AST-${idx + 1}`,
      assetName: `Asset ${idx + 1}`,
      assetCategory: 'Category',
      status: 'ACTIVE',
      location: `Loc ${idx + 1}`
    }));

    await mockAssetsApi(page, bigList);

    await page.goto('/assets');
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.locator('.pager-info').first()).toHaveText('Showing 1 - 10 of 15');

    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.locator('.pager-info').first()).toHaveText('Showing 11 - 15 of 15');
    await expect(page.getByRole('row', { name: /Asset 11/ })).toBeVisible();

    await page.getByRole('button', { name: /Previous/i }).click();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
  });

  test('hides create/edit/delete controls without permissions', async ({ page }) => {
    await primeAuthAndPermissions(page, { ASSET: ['READ'] });
    await mockAssetsApi(page, [{ id: 1, assetId: 'AST-1', assetName: 'Limited Asset', assetCategory: 'General', status: 'ACTIVE', location: 'Main' }]);

    await page.goto('/assets');

    await expect(page.getByRole('button', { name: /\+ New Assets/ })).toHaveCount(0);
    await expect(page.getByLabel('Edit asset')).toHaveCount(0);
    await expect(page.getByLabel('Delete asset')).toHaveCount(0);
  });

  test('deletes an asset via modal confirmation and refreshes list', async ({ page }) => {
    const assets = await mockAssetsApi(page, [
      { id: 1, assetId: 'AST-DEL', assetName: 'Delete Me', assetCategory: 'Temp', status: 'ACTIVE', location: 'Floor 1' }
    ]);

    await page.goto('/assets');
    await page.getByLabel('Delete asset').click();

    const deleteRequest = page.waitForRequest((req: Request) => req.method() === 'DELETE' && /api\/assets\/1$/.test(req.url()));
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleteRequest;

    assets.assets = [];
    await expect(page.getByText('No assets to display.')).toBeVisible();
    await expect(page.locator('.pagination')).toHaveCount(0);
  });
});
