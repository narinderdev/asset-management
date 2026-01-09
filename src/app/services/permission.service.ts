import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type ModuleKey = string;
type ActionKey = string;

interface StoredPermissions {
  modules: Record<ModuleKey, ActionKey[]>;
}

const STORAGE_KEY = 'userPermissions';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setFromUser(user: any): void {
    if (!this.isBrowser) {
      return;
    }
    const modules: Record<ModuleKey, ActionKey[]> = {};
    const procurementModules = new Set(['MATERIAL_REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIPT_NOTE']);

    const roles = user?.userRoles ?? [];
    roles.forEach((ur: any) => {
      const perms = ur?.role?.permissions ?? [];
      perms.forEach((p: any) => {
        const moduleKey = String(p?.module || '').toUpperCase();
        const action = String(p?.action || '').toUpperCase();
        if (!moduleKey) {
          return;
        }
        modules[moduleKey] = modules[moduleKey] || [];
        if (action) {
          modules[moduleKey].push(action);
        }
        if (procurementModules.has(moduleKey)) {
          modules['PROCUREMENT'] = modules['PROCUREMENT'] || [];
          modules['PROCUREMENT'].push(action || 'ACCESS');
        }
      });
    });

    const payload: StoredPermissions = { modules };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  clear(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  getAllowedModules(): ModuleKey[] {
    if (!this.isBrowser) {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed: StoredPermissions = JSON.parse(raw);
      return Object.keys(parsed.modules || {});
    } catch {
      return [];
    }
  }

  hasPermission(module: ModuleKey, action: ActionKey): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    try {
      const parsed: StoredPermissions = JSON.parse(raw);
      const list = parsed.modules?.[module.toUpperCase()] || [];
      return list.includes(action.toUpperCase());
    } catch {
      return false;
    }
  }
}
