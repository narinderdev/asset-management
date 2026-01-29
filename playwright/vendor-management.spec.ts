import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { VENDOR: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });

const mockVendorsList = async (page: Page) => {
  await page.route('**/api/vendors**', async route => {
    if (route.request().method() === 'GET') {
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
                active: true
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
                active: false
              }
            ],
            totalElements: 2,
            page: 0,
            size: 10
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

test.describe('Vendor Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists vendors', async ({ page }) => {
    await mockVendorsList(page);
    await page.goto('/vendor-management');

    await expect(page.getByText('Acme Supplies')).toBeVisible();
    await expect(page.getByText('jane@acme.com')).toBeVisible();
    await expect(page.getByText('Beta Tools')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('views vendor detail', async ({ page }) => {
    await mockVendorsList(page);
    await page.route('**/api/vendors/1', async route => {
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
            active: true
          }
        })
      });
    });

    await page.goto('/vendor-management');
    await page.getByRole('link', { name: /View/i }).first().click();

    await expect(page).toHaveURL(/\/vendor-management\/view\/1/);
    await expect(page.getByText('Acme Supplies')).toBeVisible();
    await expect(page.getByText('123 Main St')).toBeVisible();
    await expect(page.getByText('NET30')).toBeVisible();
  });

  test('creates a vendor', async ({ page }) => {
    await mockVendorsList(page);

    let postPayload: any = {};
    await page.route('**/api/vendors', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 10 } })
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
    await page.locator('input[name="paymentTerms"]').fill('NET45');
    await page.getByRole('button', { name: /Create Vendor/i }).click();

    expect(postPayload.vendorName).toBe('New Vendor');
    expect(postPayload.contactPerson).toBe('Alice');
    expect(postPayload.email).toBe('alice@newvendor.com');
    expect(postPayload.paymentTerms).toBe('NET45');
    await expect(page).toHaveURL(/\/vendor-management$/);
  });

  test('updates a vendor', async ({ page }) => {
    await mockVendorsList(page);

    await page.route('**/api/vendors/2', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 2,
              vendorName: 'Beta Tools',
              contactPerson: 'John Smith',
              email: 'john@beta.com',
              phone: '5558889999',
              paymentTerms: 'NET15',
              rating: 4,
              active: false
            }
          })
        });
        return;
      }
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 2 } })
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
    await page.locator('input[name="vendorName"]').fill('Beta Tools Updated');
    await page.getByRole('button', { name: /Update Vendor/i }).click();

    expect(patchPayload.vendorName).toBe('Beta Tools Updated');
    await expect(page).toHaveURL(/\/vendor-management$/);
  });

  test('deletes a vendor from listing', async ({ page }) => {
    await mockVendorsList(page);
    let deleteCalled = false;
    await page.route('**/api/vendors/1', async route => {
      deleteCalled = true;
      await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
    });

    await page.goto('/vendor-management');
    await page.getByLabel(/Delete vendor/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
