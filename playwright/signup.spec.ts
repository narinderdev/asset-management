import { test, expect } from '@playwright/test';

const typeDelay = 140; // ms per character to make typing visible in UI/trace

test('sign up form submit redirects to OTP verification', async ({ page }) => {
  // Mock signup API to return success
  await page.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 201,
        message: 'Signup successful',
        data: { id: 42, email: 'new.user@example.com' }
      })
    });
  });

  await page.goto('/sign-up');
  await page.waitForSelector('input[name="firstName"]');

  await page.locator('input[name="firstName"]').type('Ada', { delay: typeDelay });
  await page.locator('input[name="lastName"]').type('Lovelace', { delay: typeDelay });
  await page.locator('input[name="email"]').type('ada@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('Password1!', { delay: typeDelay });
  await page.locator('input[name="confirmPassword"]').type('Password1!', { delay: typeDelay });

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/verify-otp/);
});
