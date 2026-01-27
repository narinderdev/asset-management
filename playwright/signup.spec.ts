import { test, expect } from '@playwright/test';

const typeDelay = 120; // ms per character to make typing visible in UI/trace

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

test('sign up shows validation errors for missing fields', async ({ page }) => {
  await page.goto('/sign-up');
  await page.waitForSelector('button[type="submit"]');

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/sign-up/);
  await expect(page.getByText(/First name must be at least 2 letters/i)).toBeVisible();
  await expect(page.getByText(/Last name must be at least 2 letters/i)).toBeVisible();
  await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
  await expect(page.getByText(/Password must be 8\+ characters with 1 uppercase, 1 number, and 1 symbol/i)).toBeVisible();
});

test('sign up blocks mismatched passwords', async ({ page }) => {
  await page.goto('/sign-up');
  await page.waitForSelector('input[name="firstName"]');

  await page.locator('input[name="firstName"]').type('Grace', { delay: typeDelay });
  await page.locator('input[name="lastName"]').type('Hopper', { delay: typeDelay });
  await page.locator('input[name="email"]').type('grace@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('Password1!', { delay: typeDelay });
  await page.locator('input[name="confirmPassword"]').type('Password2!', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
});

test('sign up enforces password strength', async ({ page }) => {
  await page.goto('/sign-up');
  await page.waitForSelector('input[name="password"]');

  await page.locator('input[name="firstName"]').type('Weak', { delay: typeDelay });
  await page.locator('input[name="lastName"]').type('Password', { delay: typeDelay });
  await page.locator('input[name="email"]').type('weak@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('weak', { delay: typeDelay });
  await page.locator('input[name="confirmPassword"]').type('weak', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page.getByText(/Password must be 8\+ characters with 1 uppercase, 1 number, and 1 symbol/i)).toBeVisible();
});

test('sign up shows duplicate email error from API', async ({ page }) => {
  await page.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 409,
        message: 'Email already exists'
      })
    });
  });

  await page.goto('/sign-up');
  await page.waitForSelector('input[name="firstName"]');

  await page.locator('input[name="firstName"]').type('Existing', { delay: typeDelay });
  await page.locator('input[name="lastName"]').type('User', { delay: typeDelay });
  await page.locator('input[name="email"]').type('existing@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('Password1!', { delay: typeDelay });
  await page.locator('input[name="confirmPassword"]').type('Password1!', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/sign-up/);
  await expect(page.getByRole('alert', { name: /Email already exists/i }).first()).toBeVisible();
});

test('sign up shows generic error on server failure', async ({ page }) => {
  await page.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        message: 'Server error'
      })
    });
  });

  await page.goto('/sign-up');
  await page.waitForSelector('input[name="firstName"]');

  await page.locator('input[name="firstName"]').type('Fail', { delay: typeDelay });
  await page.locator('input[name="lastName"]').type('Case', { delay: typeDelay });
  await page.locator('input[name="email"]').type('fail@example.com', { delay: typeDelay });
  await page.locator('input[name="password"]').type('Password1!', { delay: typeDelay });
  await page.locator('input[name="confirmPassword"]').type('Password1!', { delay: typeDelay });

  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/sign-up/);
  await expect(page.getByRole('alert', { name: /Server error|Signup failed/i }).first()).toBeVisible();
});
