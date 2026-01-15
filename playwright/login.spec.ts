import { test, expect } from '@playwright/test';

const typeDelay = 140; // ms per character for slower, visible typing

test('login success navigates to dashboard', async ({ page }) => {
  await page.route('**/auth', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Login successful',
        data: { token: 'fake-jwt-token', user: { id: 1, name: 'Test User' } }
      })
    });
  });

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]');

  await page.locator('input[name="email"]').type('test@gmail.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('123456', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
});

test('login shows error on invalid credentials', async ({ page }) => {
  await page.route('**/auth', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    });
  });

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]');

  await page.locator('input[name="email"]').type('wrong@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('wrongpass', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('alert', { name: /Invalid credentials/i }).first()).toBeVisible();
});

test('login stays on page if fields are empty and shows validation', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('button[type="submit"]');

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/login/);
  await expect(page.getByText(/Enter a valid email/i)).toBeVisible();
  await expect(page.getByText(/Password is required/i)).toBeVisible();
});

test('login shows generic error on server failure', async ({ page }) => {
  await page.route('**/auth', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        message: 'Server error'
      })
    });
  });

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]');

  await page.locator('input[name="email"]').type('test@gmail.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('123456', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('alert', { name: /Login failed|Server error/i }).first()).toBeVisible();
});
