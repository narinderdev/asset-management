import { test, expect } from '@playwright/test';

const apiBase = '**/api';

const dashboardPayload = {
  statusCode: 200,
  data: {
    totalTechnicians: 3,
    availableToday: 1,
    onLeave: 0,
    workOrders: 5,
    recentActivities: []
  }
};

const techniciansPayload = {
  data: {
    technicians: [
      {
        id: 101,
        technicianId: 'TECH-000001',
        firstName: 'Vivek',
        lastName: 'Jandrotia',
        phoneNumber: '8219325453',
        email: 'tech@example.com',
        teamName: 'Team Alpha',
        workStatus: 'AVAILABLE',
        workShift: 'DAY'
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const teamsPayload = {
  data: {
    teams: [
      {
        id: 5,
        teamName: 'Team Alpha',
        teamLeaderName: 'Lead One',
        technicians: [{}, {}, {}]
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const workOrdersPayload = {
  data: {
    workOrders: [
      {
        id: 77,
        workOrderId: 'WO-20260121-5099',
        woTitle: 'PM: reergv',
        descriptionScope: 'Preventive maintenance',
        assignedTechnicianName: 'Unassigned',
        priority: 'MEDIUM',
        status: 'APPROVED',
        targetCompletionDate: '2026-01-16'
      }
    ],
    totalElements: 1,
    size: 10,
    page: 0
  }
};

const holidaysPayload = {
  data: {
    holidays: [
      { id: 2, holidayName: 'Test Holiday', holidayType: 'COMPANY', holidayDate: '2026-02-06', notes: 'note' }
    ]
  }
};

test.describe('TM module', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'playwright-token');
      localStorage.setItem('userPermissions', JSON.stringify({ modules: { TM_SYSTEM: ['VIEW'], WORK_ORDER: ['VIEW'], HOLIDAYS: ['VIEW'], TECHNICIAN: ['VIEW'], TECHNICIAN_TEAM: ['VIEW'] } }));
    });
    // Stub TM APIs
    await page.route(`${apiBase}/dashboard/technicians`, (route) => route.fulfill({ json: dashboardPayload }));
    await page.route(`${apiBase}/technicians`, (route) => route.fulfill({ json: techniciansPayload }));
    await page.route(`${apiBase}/technician-teams`, (route) => route.fulfill({ json: teamsPayload }));
    await page.route(`${apiBase}/work-orders`, (route) => route.fulfill({ json: workOrdersPayload }));
    await page.route(`${apiBase}/holidays`, (route) => route.fulfill({ json: holidaysPayload }));
    await page.route(`${apiBase}/technicians/leaves`, (route) => route.fulfill({ json: { data: { leaves: [] } } }));
  });

  test('dashboard shows metrics', async ({ page }) => {
    await page.goto('/tm-system/dashboard');
    await expect(page.getByText('Total Technicians').first()).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    await expect(page.getByText('Work Orders')).toBeVisible();
  });

  test('technician list renders rows', async ({ page }) => {
    await page.goto('/tm-system/technicians');
    await expect(page.getByText('TECH-000001')).toBeVisible();
    await expect(page.getByText('Vivek')).toBeVisible();
  });

  test('teams tab renders rows', async ({ page }) => {
    await page.goto('/tm-system/teams');
    await expect(page.getByText('Team Alpha')).toBeVisible();
    await expect(page.getByText('Lead One')).toBeVisible();
  });

  test('work orders tab renders rows', async ({ page }) => {
    await page.goto('/tm-system/work-orders');
    await expect(page.getByText('WO-20260121-5099')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
  });

  test('holidays list renders rows', async ({ page }) => {
    await page.goto('/tm-system/leaves');
    await expect(page.getByText('Test Holiday')).toBeVisible();
    await expect(page.getByText('COMPANY')).toBeVisible();
  });
});
