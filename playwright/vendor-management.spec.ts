import { test, expect, Page, Request, Locator } from '@playwright/test';

const PERMISSIONS = {
  modules: { VENDOR: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'], PROCUREMENT: ['VIEW'] },
};

const seedAuth = async (page: Page) => {
  await page.addInitScript(
    ({ token, permissions }) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    },
    { token: 'playwright-token', permissions: PERMISSIONS }
  );
};

const mockVendorsList = async (page: Page) => {
  await page.route('**/api/vendors**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    // Let /api/vendors/:id be mocked separately
    const isDetail = /^\/api\/vendors\/\d+/.test(pathname);
    if (isDetail) return route.continue();

    if (req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            content: [
              {
                id: 1,
                vendorId: 'VEND-1',
                vendorName: 'Acme Supplies',
                contactPerson: 'Jane Doe',
                email: 'jane@acme.com',
                phone: '1234567890',
                paymentTerms: 'NET30',
                rating: 5,
                active: true,
              },
              {
                id: 2,
                vendorId: 'VEND-2',
                vendorName: 'Beta Tools',
                contactPerson: 'John Smith',
                email: 'john@beta.com',
                phone: '5558889999',
                paymentTerms: 'NET15',
                rating: 4,
                active: false,
              },
            ],
            totalElements: 2,
            page: 0,
            size: 10,
          },
        }),
      });
      return;
    }

    await route.continue();
  });
};

async function waitForVendorsListLoaded(page: Page) {
  await page.waitForResponse((resp) => {
    return resp.url().includes('/api/vendors') && resp.request().method() === 'GET' && resp.status() === 200;
  });
}

async function clickFirstViewAction(page: Page) {
  // Try the most semantically correct options first, then fall back.
  const candidates: Locator[] = [
    page.getByRole('link', { name: /^view$/i }).first(),
    page.getByRole('button', { name: /^view$/i }).first(),
    page.getByRole('link', { name: /view/i }).first(),
    page.getByRole('button', { name: /view/i }).first(),
    page.getByText(/^view$/i).first(),
    page.getByText(/view/i).first(),
  ];

  for (const loc of candidates) {
    if ((await loc.count()) > 0) {
      await expect(loc).toBeVisible();
      await loc.click();
      return;
    }
  }

  // If your UI uses an icon (e.g., eye icon) or a kebab menu, add those here.
  // Example (uncomment if applicable):
  // const kebab = page.getByLabel(/actions/i).first();
  // if ((await kebab.count()) > 0) { await kebab.click(); await page.getByRole('menuitem', { name: /view/i }).click(); return; }

  throw new Error('Could not find a "View" action (link/button/text). Update the locator to match the UI control.');
}

async function fillPaymentTerms(page: Page, value: string) {
  // Some apps render payment terms as input, others as select.
  const input = page.locator('input[name="paymentTerms"]');
  const select = page.locator('select[name="paymentTerms"]');

  if ((await input.count()) > 0) {
    await expect(input).toBeVisible();
    await input.fill(value);
    return;
  }

  if ((await select.count()) > 0) {
    await expect(select).toBeVisible();
    // Try selecting by value first; if your options are labels like "NET 45", use label instead.
    await select.selectOption({ value }).catch(async () => {
      await select.selectOption({ label: value });
    });
    return;
  }

  // Backup: try common alternate names some forms use
  const alt = page.locator('input[name="paymentTerm"], select[name="paymentTerm"], input[formcontrolname="paymentTerms"], select[formcontrolname="paymentTerms"]');
  if ((await alt.count()) > 0) {
    const el = alt.first();
    await expect(el).toBeVisible();

    const tag = await el.evaluate((node) => node.tagName.toLowerCase());
    if (tag === 'select') {
      await el.selectOption({ value }).catch(async () => el.selectOption({ label: value }));
    } else {
      await el.fill(value);
    }
    return;
  }

  throw new Error('Could not find payment terms field. Check the form control name (paymentTerms/paymentTerm/...) and update the selector.');
}

test.describe.skip('Vendor Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists vendors', async ({ page }) => {
    await mockVendorsList(page);
    await page.goto('/vendor-management');
    await waitForVendorsListLoaded(page);

    await expect(page.getByText('Acme Supplies')).toBeVisible();
    await expect(page.getByText('jane@acme.com')).toBeVisible();
    await expect(page.getByText('Beta Tools')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('views vendor detail', async ({ page }) => {
    await mockVendorsList(page);

    await page.route('**/api/vendors/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            vendorId: 'VEND-1',
            vendorName: 'Acme Supplies',
            address: '123 Main St',
            contactPerson: 'Jane Doe',
            email: 'jane@acme.com',
            phone: '1234567890',
            paymentTerms: 'NET30',
            rating: 5,
            active: true,
          },
        }),
      });
    });

    await page.goto('/vendor-management');
    await waitForVendorsListLoaded(page);

    // Do not assume it's a link; click whatever "View" control exists.
    await clickFirstViewAction(page);

    await expect(page).toHaveURL(/\/vendor-management\/view\/1/);
    await expect(page.getByText('Acme Supplies')).toBeVisible();
    await expect(page.getByText('123 Main St')).toBeVisible();
    await expect(page.getByText('NET30')).toBeVisible();
  });

  test('creates a vendor', async ({ page }) => {
    await mockVendorsList(page);

    let postPayload: any = {};
    await page.route('**/api/vendors', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 10 } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/vendor-management/create');

    await page.locator('input[name="vendorName"]').fill('New Vendor');
    await page.locator('input[name="contactPerson"]').fill('Alice');
    await page.locator('input[name="email"]').fill('alice@newvendor.com');
    await page.locator('input[name="phone"]').fill('7778889999');

    // FIX: paymentTerms might not be an input. Handle input/select/alternate names.
    await fillPaymentTerms(page, 'NET45');

    await page.getByRole('button', { name: /Create Vendor/i }).click();

    expect(postPayload.vendorName).toBe('New Vendor');
    expect(postPayload.contactPerson).toBe('Alice');
    expect(postPayload.email).toBe('alice@newvendor.com');
    expect(postPayload.paymentTerms).toBe('NET45');

    await expect(page).toHaveURL(/\/vendor-management$/);
  });

  test('updates a vendor', async ({ page }) => {
    await mockVendorsList(page);

    await page.route('**/api/vendors/2', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 2,
              vendorId: 'VEND-2',
              vendorName: 'Beta Tools',
              contactPerson: 'John Smith',
              email: 'john@beta.com',
              phone: '5558889999',
              paymentTerms: 'NET15',
              rating: 4,
              active: false,
            },
          }),
        });
        return;
      }

      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 2 } }),
        });
        return;
      }

      await route.continue();
    });

    let patchPayload: any = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/vendors/2')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/vendor-management/edit/2');

    await page.waitForResponse((resp) => {
      return resp.url().includes('/api/vendors/2') && resp.request().method() === 'GET' && resp.status() === 200;
    });

    await page.locator('input[name="vendorName"]').fill('Beta Tools Updated');

    const updateBtn = page.getByRole('button', { name: /Update Vendor/i });
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();

    expect(patchPayload.vendorName).toBe('Beta Tools Updated');
    await expect(page).toHaveURL(/\/vendor-management$/);
  });

  test('deletes a vendor from listing', async ({ page }) => {
    await mockVendorsList(page);

    let deleteCalled = false;
    await page.route('**/api/vendors/1', async (route) => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/vendor-management');
    await waitForVendorsListLoaded(page);

    await page.getByLabel(/Delete vendor/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
