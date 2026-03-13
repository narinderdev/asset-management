import { expect, test, type Page } from '@playwright/test';

test.use({ storageState: null });

const seedSession = async (page: Page, modules: Record<string, string[]>) => {
  await page.addInitScript((seedModules) => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('userPermissions', JSON.stringify({ modules: seedModules }));
    localStorage.setItem('currentUser', JSON.stringify({ firstName: 'Playwright', lastName: 'User' }));
  }, modules);
};

const silenceApiGetCalls = async (page: Page) => {
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

test.describe('Sidebar permissions', () => {
  test('hides restricted sidebar tabs when user has no module permissions', async ({ page }) => {
    await seedSession(page, {});
    await silenceApiGetCalls(page);

    await page.goto('/dashboard');

    const menuLabels = page.locator('.sidebar-nav .menu-label');
    await expect(menuLabels.filter({ hasText: /^Dashboard$/ })).toHaveCount(1);
    await expect(menuLabels.filter({ hasText: /^TM System$/ })).toHaveCount(0);

    await expect(menuLabels.filter({ hasText: /^Assets$/ })).toHaveCount(0);
    await expect(menuLabels.filter({ hasText: /^Work Order$/ })).toHaveCount(0);
    await expect(menuLabels.filter({ hasText: /^Inventory$/ })).toHaveCount(0);
    await expect(menuLabels.filter({ hasText: /^Security$/ })).toHaveCount(0);
  });

  test('shows only permitted submenu entries', async ({ page }) => {
    await seedSession(page, {
      PURCHASE_ORDER: ['VIEW']
    });
    await silenceApiGetCalls(page);

    await page.goto('/dashboard');

    const procurementLink = page
      .locator('.menu-link')
      .filter({ has: page.locator('.menu-label', { hasText: /^Procurement$/ }) });
    await procurementLink.click();

    await expect(page).toHaveURL(/\/procurement\/purchase-orders/);
    await expect(page.getByRole('link', { name: /^Purchase Order$/ })).toBeVisible();

    await expect(page.getByRole('link', { name: /^Material Requisition$/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Goods Receipt \(GRN\)$/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Return Transaction$/ })).toHaveCount(0);
  });
});
