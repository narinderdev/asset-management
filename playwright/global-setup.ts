import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:4200/login');
  await page.evaluate(() => {
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
          USERS: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
          TM_SYSTEM: ['VIEW', 'CREATE', 'UPDATE', 'DELETE']
        }
      })
    );
  });

  const authDir = path.join(__dirname, '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, 'admin.json');
  await page.context().storageState({ path: statePath });
  await browser.close();
}
