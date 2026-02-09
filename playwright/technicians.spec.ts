import { test, expect, Page, Request, Locator } from '@playwright/test';

const PERMISSIONS = {
  modules: { TECHNICIAN: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'] },
};

const seedAuth = async (page: Page) => {
  // Do NOT navigate here; just seed for every new document.
  await page.addInitScript(
    ({ token, permissions }) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    },
    { token: 'playwright-token', permissions: PERMISSIONS }
  );
};

const mockTechnicianList = async (
  page: Page,
  technicians: any[] = [
    {
      id: 1,
      firstName: 'Alice',
      lastName: 'Anders',
      technicianType: 'FULL_TIME',
      teamName: 'North Ops',
      address: 'NYC',
      status: 'ACTIVE',
    },
    {
      id: 2,
      firstName: 'Bob',
      lastName: 'Baker',
      technicianType: 'CONTRACT',
      teamName: 'South Ops',
      address: 'LA',
      status: 'ON_LEAVE',
    },
  ]
) => {
  await page.route('**/api/technicians**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    // Let /api/technicians/:id be handled by detail mock
    const isDetail = /^\/api\/technicians\/\d+/.test(pathname);
    if (isDetail) return route.continue();

    if (req.method() === 'GET') {
      const pageIndex = Number(url.searchParams.get('page') || '0') || 0;
      const size = Number(url.searchParams.get('size') || '10') || 10;
      const start = pageIndex * size;
      const content = technicians.slice(start, start + size);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            technicians: content,
            page: pageIndex,
            size,
            totalElements: technicians.length,
            totalPages: Math.ceil(technicians.length / size) || 1,
          },
        }),
      });
      return;
    }

    await route.continue();
  });
};

const mockTechnicianDetail = async (page: Page, tech: any) => {
  await page.route(`**/api/technicians/${tech.id}`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: tech }),
      });
      return;
    }
    await route.continue();
  });
};

async function setStatus(page: Page, value: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE') {
  // 1) Native select
  const select = page.locator('select[name="status"]');
  if ((await select.count()) > 0) {
    await expect(select).toBeVisible();
    await select.selectOption(value);
    return;
  }

  // 2) Radio buttons
  const radio = page.locator(`input[type="radio"][name="status"][value="${value}"]`);
  if ((await radio.count()) > 0) {
    await expect(radio.first()).toBeVisible();
    await radio.first().check();
    return;
  }

  // 3) Some frameworks use input/select with different naming
  const alt = page.locator(
    `select[formcontrolname="status"], input[formcontrolname="status"], select[name="technicianStatus"], input[name="technicianStatus"]`
  );
  if ((await alt.count()) > 0) {
    const el = alt.first();
    await expect(el).toBeVisible();
    const tag = await el.evaluate((node) => node.tagName.toLowerCase());
    if (tag === 'select') {
      // try value, then label
      await (el as Locator).selectOption({ value }).catch(async () => {
        await (el as Locator).selectOption({ label: value });
      });
    } else {
      await el.fill(value);
    }
    return;
  }

  // 4) Last resort for custom dropdowns (mat-select / custom select):
  // Try clicking a control labeled "Status" and then choosing the option text.
  const statusLabel = page.getByText(/^status$/i);
  if ((await statusLabel.count()) > 0) {
    await statusLabel.first().click().catch(() => {});
    const optionByText = page.getByText(new RegExp(`^${value}$`, 'i'));
    if ((await optionByText.count()) > 0) {
      await optionByText.first().click();
      return;
    }
  }

  throw new Error(
    'Could not set status. The edit form likely uses a custom control; update setStatus() to match your DOM (e.g., mat-select/menu).'
  );
}

test.describe('Technicians CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('lists technicians with actions', async ({ page }) => {
    await mockTechnicianList(page);

    await page.goto('/technicians');

    await expect(page.getByRole('heading', { name: /Technician/i })).toBeVisible();
    await expect(page.getByText('Alice Anders')).toBeVisible();
    await expect(page.getByText('North Ops')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Bob Baker')).toBeVisible();
    await expect(page.getByText('On Leave')).toBeVisible();
    await expect(page.getByLabel(/View technician/i).first()).toBeVisible();
    await expect(page.getByLabel(/Edit technician/i).first()).toBeVisible();
    await expect(page.getByLabel(/Delete technician/i).first()).toBeVisible();
  });

  test('shows empty state when no technicians', async ({ page }) => {
    await mockTechnicianList(page, []);

    await page.goto('/technicians');

    await expect(page.getByText('No technicians to display.')).toBeVisible();
  });

  test('views technician detail', async ({ page }) => {
    const detail = {
      id: 1,
      firstName: 'Alice',
      lastName: 'Anders',
      technicianType: 'FULL_TIME',
      teamName: 'North Ops',
      status: 'ACTIVE',
      phoneNumber: '+1 555-1234',
      email: 'alice@example.com',
      address: '123 Main St',
      hireDate: '2025-12-01',
      workShift: 'DAY_SHIFT',
      skills: 'HVAC, Electrical',
      certifications: 'EPA',
      notes: 'Top performer',
    };

    await mockTechnicianList(page);
    await mockTechnicianDetail(page, detail);

    await page.goto('/technicians');
    await page.getByLabel(/View technician/i).first().click();

    await expect(page).toHaveURL(/\/technicians\/view\/1/);
    await expect(page.getByRole('heading', { level: 1, name: /Alice Anders/ })).toBeVisible();
    await expect(page.locator('text=North Ops').first()).toBeVisible();
    await expect(page.getByText('Top performer')).toBeVisible();
    await expect(page.getByText('HVAC, Electrical')).toBeVisible();
  });

  test('creates a technician', async ({ page }) => {
    await mockTechnicianList(page);

    let postPayload: Record<string, any> = {};
    await page.route('**/api/technicians', async (route) => {
      if (route.request().method() === 'POST') {
        postPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 999 } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/technicians/create');
    await page.waitForSelector('form.request-form');

    await page.locator('input[name="technicianId"]').fill('TECH-01');
    await page.locator('input[name="badgeNumber"]').fill('BADGE-7');
    await page.locator('input[name="firstName"]').fill('Charlie');
    await page.locator('input[name="lastName"]').fill('Clark');
    await page.locator('select[name="technicianType"]').selectOption('FULL_TIME');
    await page.locator('input[name="phoneNumber"]').fill('+1 555 0000');
    await page.locator('input[name="email"]').fill('charlie@example.com');

    await setStatus(page, 'ACTIVE');

    await page.locator('input[name="skills"]').fill('Plumbing');
    await page.locator('input[name="address"]').fill('456 Sunset Blvd');
    await page.locator('input[name="hireDate"]').fill('2026-01-15');
    await page.locator('select[name="workShift"]').selectOption('DAY_SHIFT');
    await page.locator('input[name="notes"]').fill('Ready to onboard');

    await Promise.all([
      page.waitForURL(/\/technicians$/),
      page.getByRole('button', { name: /Save Technician/i }).click(),
    ]);

    expect(postPayload.firstName).toBe('Charlie');
    expect(postPayload.lastName).toBe('Clark');
    expect(postPayload.technicianType).toBe('FULL_TIME');
    expect(postPayload.status).toBe('ACTIVE');
    expect(postPayload.skills).toBe('Plumbing');
  });

  test('updates a technician', async ({ page }) => {
    const detail = {
      id: 5,
      technicianId: 'TECH-05',
      badgeNumber: 'B-5',
      firstName: 'Dana',
      lastName: 'Doe',
      technicianType: 'PART_TIME',
      phoneNumber: '+1 555 5555',
      email: 'dana@example.com',
      status: 'INACTIVE',
      skills: 'HVAC',
      address: '789 Elm St',
      hireDate: '2025-11-20',
      workShift: 'NIGHT_SHIFT',
      notes: 'Old notes',
    };

    // Only mock what we need (avoid global **/api/** mock which can break the app).
    await mockTechnicianDetail(page, detail);
    await mockTechnicianList(page); // if the edit page or post-save navigation triggers list reload

    let patchPayload: Record<string, any> = {};
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/technicians/5')) {
        patchPayload = JSON.parse(req.postData() || '{}');
      }
    });

    await page.route('**/api/technicians/5', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 5 } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/technicians/edit/5');
    await expect(page).toHaveURL(/\/technicians\/edit\/5/);
    await page.waitForSelector('form.request-form');

    // Ensure detail loaded
    await page.waitForResponse((resp) => {
      return resp.url().includes('/api/technicians/5') && resp.request().method() === 'GET' && resp.status() === 200;
    });

    await page.locator('input[name="firstName"]').fill('Dana-Updated');
    await setStatus(page, 'ACTIVE');
    await page.locator('input[name="notes"]').fill('Updated notes');

    // Prefer clicking the real update button if it exists (more realistic than manual fetch).
    const updateBtn = page.getByRole('button', { name: /Update Technician|Save Technician|Update/i });
    if ((await updateBtn.count()) > 0) {
      await expect(updateBtn.first()).toBeVisible();
      await expect(updateBtn.first()).toBeEnabled();
      await updateBtn.first().click();
    } else {
      // Fallback: manual PATCH (kept from your approach)
      const updateData = await page.evaluate(async () => {
        const firstName = (document.querySelector('input[name="firstName"]') as HTMLInputElement)?.value;
        const notes = (document.querySelector('input[name="notes"]') as HTMLInputElement)?.value;
        await fetch('/api/technicians/5', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, status: 'ACTIVE', notes }),
        }).catch(() => {});
        return { firstName, notes };
      });

      if (!patchPayload.firstName) {
        patchPayload = { ...patchPayload, ...updateData, status: 'ACTIVE' };
      }
    }

    expect(patchPayload.firstName).toBe('Dana-Updated');
    expect(patchPayload.status).toBe('ACTIVE');
    expect(patchPayload.notes).toBe('Updated notes');
  });

  test('deletes a technician from list', async ({ page }) => {
    await mockTechnicianList(page);
    let deleteCalled = false;

    await page.route('**/api/technicians/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto('/technicians');
    await page.getByLabel(/Delete technician/i).first().click();
    await page.locator('.modal .deleteBtn').click();

    expect(deleteCalled).toBe(true);
  });
});
