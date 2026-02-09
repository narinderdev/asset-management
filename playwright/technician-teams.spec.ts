import { test, expect, Page, Request } from '@playwright/test';

const seedAuth = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('authToken', 'playwright-token');
    localStorage.setItem(
      'userPermissions',
      JSON.stringify({ modules: { TECHNICIAN_TEAM: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] } })
    );
  });

const mockTechniciansForOptions = async (page: Page) => {
  await page.route('**/api/technicians**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            technicians: [
              { id: 10, fullName: 'Alice Smith' },
              { id: 11, fullName: 'Bob Stone' }
            ],
            totalElements: 2,
            page: 0,
            size: 100
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const mockTeamList = async (
  page: Page,
  teams: any[] = [
    {
      id: 1,
      teamName: 'Alpha Team',
      status: 'ACTIVE',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      teamLeaderName: 'Alice Smith',
      technicians: [{ id: 10 }]
    },
    {
      id: 2,
      teamName: 'Beta Team',
      status: 'INACTIVE',
      startDate: '2026-02-01',
      endDate: null,
      teamLeaderName: 'Bob Stone',
      technicians: []
    }
  ]
) => {
  await page.route('**/api/technician-teams**', async route => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const pageIndex = Number(url.searchParams.get('page') || '0') || 0;
      const size = Number(url.searchParams.get('size') || '10') || 10;
      const start = pageIndex * size;
      const content = teams.slice(start, start + size);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            teams: content,
            totalElements: teams.length,
            page: pageIndex,
            size
          }
        })
      });
      return;
    }
    await route.continue();
  });
};

const mockTeamDetail = async (page: Page, team: any) => {
  await page.route(`**/api/technician-teams/${team.id}`, async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: team })
      });
      return;
    }
    if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: team.id } })
      });
      return;
    }
    await route.continue();
  });
};

test.describe('Technician Teams CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists technician teams', async ({ page }) => {
    await mockTeamList(page);

    await page.goto('/technicians/teams');

    await expect(page.getByRole('heading', { name: /Technician Team/i })).toBeVisible();
    await expect(page.getByText('Alpha Team')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ACTIVE', exact: true })).toBeVisible();
    await expect(page.getByText('Beta Team')).toBeVisible();
    await expect(page.getByText('INACTIVE')).toBeVisible();
    await expect(page.getByLabel(/View team/i).first()).toBeVisible();
    await expect(page.getByLabel(/Edit team/i).first()).toBeVisible();
    await expect(page.getByLabel(/Delete team/i).first()).toBeVisible();
  });

  test('shows empty state when no teams', async ({ page }) => {
    await mockTeamList(page, []);

    await page.goto('/technicians/teams');

    await expect(page.getByText('No technician team to display.')).toBeVisible();
  });

  test('views a team detail', async ({ page }) => {
    const team = {
      id: 1,
      teamName: 'Alpha Team',
      status: 'ACTIVE',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      teamLeaderName: 'Alice Smith',
      technicians: [
        { id: 10, firstName: 'Alice', lastName: 'Smith', technicianType: 'FULL_TIME', status: 'ACTIVE', email: 'alice@example.com' },
        { id: 11, firstName: 'Bob', lastName: 'Stone', technicianType: 'CONTRACT', status: 'ON_LEAVE' }
      ],
      teamDescription: 'Main ops team',
      notes: 'Handles critical sites'
    };

    await mockTeamList(page);
    await mockTeamDetail(page, team);

    await page.goto('/technicians/teams');
    await page.getByLabel(/View team/i).first().click();

    await expect(page).toHaveURL(/\/technicians\/teams\/view\/1/);
    await expect(page.getByRole('heading', { level: 1, name: /Alpha Team/ })).toBeVisible();
    await expect(page.getByText('Led by Alice Smith')).toBeVisible();
    await expect(page.getByText('Main ops team')).toBeVisible();
    await expect(page.getByText('Handles critical sites')).toBeVisible();
    await expect(page.locator('text=Alice Smith').first()).toBeVisible();
    await expect(page.getByText('Bob Stone')).toBeVisible();
  });

  test('creates a technician team', async ({ page }) => {
    await mockTeamList(page);
    await mockTechniciansForOptions(page);

    let postPayload: Record<string, any> = {};
    await page.route('**/api/technician-teams', async route => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 99 } })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/technicians/teams/create');
    await page.waitForSelector('form.request-form');

    await page.locator('input[name="teamName"]').fill('Gamma Team');
    await page.locator('select[name="status"]').selectOption('ACTIVE');
    await page.locator('input[name="startDate"]').fill('2026-01-15');
    await page.locator('input[name="teamDescription"]').fill('Response crew');

    await page.locator('.multi-trigger').click();
    const panel = page.locator('.multi-panel').first();
    await panel.getByRole('checkbox', { name: 'Alice Smith' }).check({ force: true });
    await panel.getByRole('checkbox', { name: 'Bob Stone' }).check({ force: true });
    await panel.locator('.multi-header button').first().click({ force: true });
    await page.waitForTimeout(100); // allow dropdown to close and options to populate
    await page.locator('select[name="teamLeaderId"]').selectOption({ label: 'Alice Smith' });

    await Promise.all([
      page.waitForURL(/\/technicians\/teams$/),
      page.getByRole('button', { name: /Save Team/i }).click()
    ]);

    expect(postPayload.teamName).toBe('Gamma Team');
    expect(postPayload.status).toBe('ACTIVE');
    expect(postPayload.startDate).toBe('2026-01-15');
    expect(postPayload.teamLeaderId).toBe(10);
    expect(postPayload.technicianIds).toEqual(expect.arrayContaining([10, 11]));
  });

  test('updates a technician team', async ({ page }) => {
    const team = {
      id: 5,
      teamName: 'Delta Team',
      status: 'INACTIVE',
      startDate: '2025-12-01',
      endDate: '',
      teamDescription: 'Legacy crew',
      notes: 'Old notes',
      technicians: [
        { id: 10, fullName: 'Alice Smith' },
        { id: 11, fullName: 'Bob Stone' }
      ],
      teamLeaderId: 11,
      teamLeaderName: 'Bob Stone'
    };

    await mockTeamDetail(page, team);
    await mockTechniciansForOptions(page);

    let patchPayload: Record<string, any> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/technician-teams/5')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.goto('/technicians/teams/edit/5');
    await page.waitForSelector('form.request-form');

    await page.locator('input[name="teamName"]').fill('Delta Team Updated');
    await page.locator('select[name="status"]').selectOption('ACTIVE');
    await page.locator('.multi-trigger').click();
    const editPanel = page.locator('.multi-panel').first();
    await editPanel.getByRole('checkbox', { name: 'Alice Smith' }).click({ force: true }); // toggle selection
    await editPanel.locator('.multi-header button').first().click({ force: true });
    await page.waitForTimeout(100);
    await page.locator('select[name="teamLeaderId"]').selectOption({ label: 'Bob Stone' });

    await Promise.all([
      page.waitForURL(/\/technicians\/teams$/),
      page.getByRole('button', { name: /Save Team/i }).click()
    ]);

    expect(patchPayload.teamName).toBe('Delta Team Updated');
    expect(patchPayload.status).toBe('ACTIVE');
    expect(patchPayload.teamLeaderId).toBe(11);
  });

  test('deletes a technician team from list', async ({ page }) => {
    await mockTeamList(page);
    let deleteCalled = false;

    await page.route('**/api/technician-teams/1', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto('/technicians/teams');
    await page.getByLabel(/Delete team/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
