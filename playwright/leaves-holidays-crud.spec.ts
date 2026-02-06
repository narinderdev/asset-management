import { test, expect, Page, Route } from '@playwright/test';

type Leave = { id: number; technicianId: number; technicianName: string; startDate: string; endDate: string; reason: string; status?: string };
type Holiday = { id: number; holidayName: string; holidayType: string; holidayDate: string; notes?: string };

const apiBase = '**/api/**';

async function mockTmApis(page: Page) {
  // simple in-memory fixtures so we can mutate during tests
  const technicians = [{ id: 123, name: 'Sharina Thakur' }];
  const leaves: Leave[] = [
    { id: 1, technicianId: 123, technicianName: 'Sharina Thakur', startDate: '2026-02-10', endDate: '2026-02-12', reason: 'Fever' }
  ];
  const holidays: Holiday[] = [
    { id: 5, holidayName: 'Test Holiday', holidayType: 'COMPANY', holidayDate: '2026-02-09', notes: 'note' }
  ];

  await page.addInitScript(() => localStorage.setItem('authToken', 'playwright-token'));

  // technicians list
  await page.route('**/api/technicians**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: { technicians, totalElements: technicians.length, size: 10, page: 0 } } });
  });

  // leaves list (aggregated)
  await page.route('**/api/technicians/leaves**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { data: { leaves } } });
  });

  // technician-scoped leaves (GET/POST/PATCH/DELETE)
  await page.route('**/api/technicians/*/leaves**', async (route: Route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean); // ["api","technicians","123","leaves","10"?]
    const techId = Number(parts[2]);
    const maybeLeaveId = parts[4] ? Number(parts[4]) : undefined;
    const method = route.request().method();

    if (method === 'GET') {
      const data = maybeLeaveId
        ? leaves.find((l) => l.id === maybeLeaveId && l.technicianId === techId)
        : leaves.filter((l) => l.technicianId === techId);
      return route.fulfill({ json: { data: { leaves: Array.isArray(data) ? data : [data].filter(Boolean) } } });
    }

    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const newLeave: Leave = {
        id: Math.max(0, ...leaves.map((l) => l.id)) + 1,
        technicianId: techId,
        technicianName: technicians.find((t) => t.id === techId)?.name ?? 'Tech',
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason
      };
      leaves.unshift(newLeave);
      return route.fulfill({ json: { data: newLeave } });
    }

    if (method === 'PATCH' && maybeLeaveId) {
      const body = await route.request().postDataJSON();
      const idx = leaves.findIndex((l) => l.id === maybeLeaveId && l.technicianId === techId);
      if (idx >= 0) {
        leaves[idx] = { ...leaves[idx], ...body };
      }
      return route.fulfill({ json: { data: leaves[idx] } });
    }

    if (method === 'DELETE' && maybeLeaveId) {
      const idx = leaves.findIndex((l) => l.id === maybeLeaveId && l.technicianId === techId);
      if (idx >= 0) leaves.splice(idx, 1);
      return route.fulfill({ status: 204, body: '' });
    }

    return route.fallback();
  });

  // holidays CRUD
  await page.route('**/api/holidays**', async (route: Route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean); // ["api","holidays","5"?]
    const maybeId = parts[2] ? Number(parts[2]) : undefined;
    const method = route.request().method();

    if (method === 'GET') {
      if (maybeId) {
        const h = holidays.find((h) => h.id === maybeId);
        return route.fulfill({ json: { data: h } });
      }
      return route.fulfill({ json: { data: { holidays } } });
    }

    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const newHoliday: Holiday = {
        id: Math.max(0, ...holidays.map((h) => h.id)) + 1,
        holidayName: body.holidayName,
        holidayType: body.holidayType,
        holidayDate: body.holidayDate,
        notes: body.notes
      };
      holidays.unshift(newHoliday);
      return route.fulfill({ json: { data: newHoliday } });
    }

    if (method === 'PATCH' && maybeId) {
      const body = await route.request().postDataJSON();
      const idx = holidays.findIndex((h) => h.id === maybeId);
      if (idx >= 0) holidays[idx] = { ...holidays[idx], ...body };
      return route.fulfill({ json: { data: holidays[idx] } });
    }

    if (method === 'DELETE' && maybeId) {
      const idx = holidays.findIndex((h) => h.id === maybeId);
      if (idx >= 0) holidays.splice(idx, 1);
      return route.fulfill({ status: 204, body: '' });
    }

    return route.fallback();
  });
}

test.describe('Leaves & Holidays CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await mockTmApis(page);
  });

  test.fixme('get leaves, add, edit, delete', async ({ page }) => {
    await page.goto('/tm-system/leaves');

    // initial list
    await expect(page.getByText('Sharina Thakur')).toBeVisible();

    // add leave
    await page.getByRole('button', { name: '+ Add Leave' }).click();
    const techSelect = page.getByRole('combobox', { name: 'Technician' });
    await techSelect.waitFor({ state: 'visible' });
    await techSelect.selectOption('123');
    await page.getByLabel('From Date').fill('2026-03-01');
    await page.getByLabel('To Date').fill('2026-03-02');
    await page.getByLabel('Reason').fill('Playwright add leave');
    await page.getByRole('button', { name: 'Save Leave' }).click();
    await expect(page.getByRole('heading', { name: 'Add Leave' })).not.toBeVisible();
    await expect(page.getByText('Playwright add leave')).toBeVisible();

    // edit leave (first row)
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Reason').fill('Playwright edit leave');
    await page.getByRole('button', { name: 'Update Leave' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Leave' })).not.toBeVisible();
    await expect(page.getByText('Playwright edit leave')).toBeVisible();

    // delete leave (first row)
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.locator('.modal-overlay').last().getByRole('button', { name: 'Delete' }).click(); // confirm in modal
    await expect(page.getByText('Playwright edit leave')).not.toBeVisible();
  });

  test.fixme('get holidays, add, edit, delete', async ({ page }) => {
    await page.goto('/tm-system/leaves');
    await page.locator('.lh-tabs button', { hasText: 'Holidays' }).click();

    // initial
    await expect(page.getByText('Test Holiday')).toBeVisible();

    // add holiday
    await page.getByRole('button', { name: '+ Add Holiday' }).click();
    await page.getByLabel('Holiday Name').fill('Playwright Holiday');
    await page.getByLabel('Holiday Type').selectOption('COMPANY');
    await page.getByLabel('Holiday Date').fill('2026-03-10');
    await page.getByLabel('Notes').fill('holiday note');
    await page.getByRole('button', { name: 'Save Holiday' }).click();
    await expect(page.getByRole('heading', { name: 'Add Holiday' })).not.toBeVisible();
    await expect(page.getByText('Playwright Holiday')).toBeVisible();

    // edit holiday (first row)
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Notes').fill('updated note');
    await page.getByRole('button', { name: 'Update Holiday' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Holiday' })).not.toBeVisible();
    await expect(page.getByText('updated note')).toBeVisible();

    // delete holiday
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.locator('.modal-overlay').last().getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Playwright Holiday')).not.toBeVisible();
  });
});
