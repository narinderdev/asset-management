import { expect, test, type Page } from '@playwright/test';

const seedAuth = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({
        modules: {
          WORK_ORDER: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          INVENTORY: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          WAREHOUSE: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          PROCUREMENT: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          VENDOR: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          SERVICE_REQUEST: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TECHNICIAN: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TECHNICIAN_TEAM: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          ROLES: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          USERS: ['VIEW', 'CREATE', 'UPDATE', 'DELETE']
        }
      })
    );
  });
};

const mockDashboardApis = async (page: Page) => {
  await page.route('**/api/dashboard', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summary_metrics: {},
          recent_work_orders: [],
          new_service_requests: [],
          work_orders_by_status: {},
          maintenance_cost_summary: { data: [] }
        }
      })
    });
  });

  await page.route('**/api/security-dashboard**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'ok',
        data: {
          thisWeek: {
            period: 'THIS_WEEK',
            kpiSummary: {
              newUsersAdded: 1,
              usersRemovedOrDisabled: 0,
              newRolesAdded: 1,
              roleChanges: 2,
              permissionChanges: 3
            },
            recentUserActivity: [],
            rolePermissionChanges: [],
            securityLog: []
          }
        }
      })
    });
  });

  await page.route('**/api/reports/assets**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          content: [{ id: 1, assetName: 'Pump A', assetId: 'AST-1' }]
        }
      })
    });
  });

  await page.route('**/api/reports/work-orders**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/budget')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalEstimatedBudget: 1000,
            totalActualBudget: 1200,
            totalVarianceAmount: 200,
            totalVariancePercentage: 20,
            workOrders: [
              {
                id: 1,
                workOrderNumber: 'WO-1',
                title: 'Budgeted work order',
                status: 'IN_PROGRESS',
                assetName: 'Pump A',
                estimatedBudget: 1000,
                actualBudget: 1200,
                varianceAmount: 200,
                variancePercentage: 20
              }
            ]
          }
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          workOrders: [{ id: 1, title: 'Budgeted work order' }]
        }
      })
    });
  });
};

test.describe('Dashboard Sidebar Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockDashboardApis(page);
  });

  test('opens Security Dashboard tab from sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    const securityTab = page.getByRole('link', { name: 'Security Dashboard' });
    if (!(await securityTab.isVisible())) {
      await page.getByRole('link', { name: 'Dashboard' }).click();
    }
    await securityTab.click();

    await expect(page).toHaveURL(/\/dashboard\/security$/);
    await expect(page.getByRole('heading', { name: 'Security Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'KPI Summary' })).toBeVisible();
  });

  test('opens Budget Dashboard tab from sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    const budgetTab = page.getByRole('link', { name: 'Budget Dashboard' });
    if (!(await budgetTab.isVisible())) {
      await page.getByRole('link', { name: 'Dashboard' }).click();
    }
    await budgetTab.click();

    await expect(page).toHaveURL(/\/dashboard\/budget$/);
    await expect(page.getByRole('heading', { name: 'Budget Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Budgeted work order' })).toBeVisible();
  });
});
