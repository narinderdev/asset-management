import { expect, test, type Page } from '@playwright/test';

const seedAuth = async (page: Page, mfaEnabled = 'false') => {
  await page.addInitScript(
    ({ enabled }) => {
      localStorage.setItem('authToken', 'playwright-token');
      localStorage.setItem(
        'userPermissions',
        JSON.stringify({ modules: { ROLES: ['VIEW'], USERS: ['VIEW'] } })
      );
      localStorage.setItem('mfaEnabled', enabled);
    },
    { enabled: mfaEnabled }
  );
};

const mockMfaApis = async (page: Page) => {
  await page.route('**/api/mfa/setup', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          secret: 'ABC123',
          qrCodeImage:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8AARAAA//8DAFf7B7kAAAAASUVORK5CYII='
        }
      })
    });
  });

  await page.route('**/api/mfa/verify-setup', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'MFA enabled successfully'
      })
    });
  });

  await page.route('**/api/mfa/disable', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'MFA disabled'
      })
    });
  });
};

test.describe('MFA Tab', () => {
  test('loads mfa setup page with qr section', async ({ page }) => {
    await seedAuth(page, 'false');
    await mockMfaApis(page);

    await page.goto('/security/mfa');

    await expect(page.getByRole('heading', { name: 'Multi-Factor Authentication' })).toBeVisible();
    await expect(page.getByText('Step 1: Scan QR Code To Setup')).toBeVisible();
    await expect(page.locator('.qr-wrap img')).toBeVisible();
  });

  test('enables mfa after entering otp', async ({ page }) => {
    await seedAuth(page, 'false');
    await mockMfaApis(page);

    await page.goto('/security/mfa');
    await expect(page.getByText('Step 2: Enter OTP To Verify')).toBeVisible();

    const inputs = page.locator('.otp-section .otp-input');
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    await inputs.nth(2).fill('3');
    await inputs.nth(3).fill('4');
    await inputs.nth(4).fill('5');
    await inputs.nth(5).fill('6');

    await page.getByRole('button', { name: /Submit OTP/i }).click();

    await expect(page.getByRole('heading', { name: 'MFA Already Enabled' })).toBeVisible();
  });

  test('opens disable mfa form from enabled state', async ({ page }) => {
    await seedAuth(page, 'true');
    await mockMfaApis(page);

    await page.goto('/security/mfa');

    await expect(page.getByRole('heading', { name: 'MFA Already Enabled' })).toBeVisible();
    await page.getByRole('button', { name: 'Disable MFA' }).click();

    await expect(page.getByText('Enter 6-digit code to disable')).toBeVisible();
    await expect(page.locator('.enabled-card .otp-input')).toHaveCount(6);
  });
});

