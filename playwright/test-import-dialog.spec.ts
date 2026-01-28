import { expect, test, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem('currentUser', JSON.stringify({ firstName: 'Playwright', lastName: 'User' }));
  });

const mockDashboardApi = async (page: Page) => {
  await page.route('**/api/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summary_metrics: {
            open_service_requests: { count: 21 },
            active_work_orders: { count: 21 },
            critical_assets_down: { count: 0 },
            requests_not_accepted_count: { count: 0 },
          },
          work_orders_by_status: { new: 5, in_progress: 3, completed: 2, total: 10 },
          maintenance_cost_summary: { data: [] },
          recent_work_orders: [],
          new_service_requests: [],
        },
      }),
    });
  });
};

test.describe('Test data import dialog', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockDashboardApi(page);
  });

  test('uploads a file through /api/upload and starts a run with the uploadId', async ({ page }) => {
    let capturedUpload: Request | null = null;
    let uploadPostData = '';

    await page.route('**/api/upload', async (route) => {
      capturedUpload = route.request();
      uploadPostData = route.request().postData() ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          status: 'OK',
          message: 'Upload received',
          data: { uploadId: 'upl-123', fileName: 'test-data.csv', rows: 42 },
        }),
      });
    });

    let runPayload: Record<string, unknown> | null = null;
    await page.route('**/api/run-test', async (route) => {
      runPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          status: 'OK',
          message: 'Run started',
          data: { runId: 'run-101', status: 'queued' },
        }),
      });
    });

    await page.route('**/api/status/run-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          status: 'OK',
          message: 'Finished',
          data: { status: 'passed', progress: 100, logs: ['Finished import'] },
        }),
      });
    });

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /Import File/i }).click();

    const dialog = page.getByRole('dialog', { name: /Import Test Data & Run/i });
    const uploadButton = dialog.getByRole('button', { name: 'Upload File' });

    await expect(uploadButton).toBeDisabled();

    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,name\n1,Example\n'),
    });

    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    const summary = dialog.locator('.upload-summary');
    await expect(summary.getByText('upl-123')).toBeVisible();
    await expect(summary.getByText('test-data.csv')).toBeVisible();
    await expect(summary.getByText('42')).toBeVisible();
    await expect(summary.getByText('Upload received')).toBeVisible();

    expect(capturedUpload).not.toBeNull();
    expect(capturedUpload?.headers()['content-type']).toContain('multipart/form-data');
    expect(uploadPostData).toContain('test-data.csv');

    await dialog.getByRole('button', { name: 'Run Test' }).click();

    await expect(dialog.getByText('Run ID: run-101')).toBeVisible();
    await expect(dialog.getByText('Passed')).toBeVisible();
    expect(runPayload).toMatchObject({ uploadId: 'upl-123' });
  });
});
