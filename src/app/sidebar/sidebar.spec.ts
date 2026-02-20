import { NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { SidebarComponent } from './sidebar';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';

const createRouterMock = () => {
  const events$ = new Subject<NavigationEnd>();
  return {
    url: '/dashboard',
    events: events$.asObservable(),
    navigate: vi.fn(),
    triggerNav(url = '/dashboard') {
      events$.next(new NavigationEnd(1, url, url));
    }
  } as unknown as Router & { triggerNav: (url?: string) => void };
};

const createPermissionMock = (allowed: string[] = [], name = 'Test User') => ({
  getAllowedModules: vi.fn(() => allowed),
  getCurrentUserName: vi.fn(() => name),
  clear: vi.fn()
});

const createAuthMock = () => ({
  logout: vi.fn(() => of({}))
});

describe('SidebarComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes user name from permission service', () => {
    const router = createRouterMock();
    const permissions = createPermissionMock([], 'Ada Lovelace');
    const auth = createAuthMock();

    const comp = new SidebarComponent(router, permissions as unknown as PermissionService, auth as unknown as AuthService);
    comp.ngOnInit();

    expect(comp.userName).toBe('Ada Lovelace');
  });

  it('filters menu items by allowed modules', () => {
    const router = createRouterMock();
    const permissions = createPermissionMock(['ASSET', 'WORK_ORDER']);
    const auth = createAuthMock();

    const comp = new SidebarComponent(router, permissions as unknown as PermissionService, auth as unknown as AuthService);

    const items = comp.menuItems;
    // dashboard/reports/tm system (no module) + assets + work order
    expect(items.length).toBe(5);
    expect(items.map(i => i.label)).toEqual(['Dashboard', 'Assets', 'Work Order', 'Reports', 'TM System']);
  });

  it('opens and closes logout modal', () => {
    const comp = new SidebarComponent(createRouterMock(), createPermissionMock() as any, createAuthMock() as any);

    comp.signOut();
    expect(comp.showLogoutModal).toBe(true);

    comp.cancelLogout();
    expect(comp.showLogoutModal).toBe(false);
  });

  it('confirms logout, clears storage, and navigates to login', () => {
    const router = createRouterMock();
    const permissions = createPermissionMock();
    const auth = createAuthMock();
    const comp = new SidebarComponent(router, permissions as unknown as PermissionService, auth as unknown as AuthService);

    localStorage.setItem('authToken', 'token123');
    comp.confirmLogout();

    expect(auth.logout).toHaveBeenCalled();
    expect(permissions.clear).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('toggles collapse state and emits change', () => {
    const router = createRouterMock();
    const permissions = createPermissionMock();
    const auth = createAuthMock();
    const comp = new SidebarComponent(router, permissions as unknown as PermissionService, auth as unknown as AuthService);

    const emitted: boolean[] = [];
    comp.collapsedChange.subscribe(v => emitted.push(v));

    comp.toggleSidebar();
    expect(comp.isCollapsed).toBe(true);
    comp.toggleSidebar();
    expect(comp.isCollapsed).toBe(false);
    expect(emitted).toEqual([true, false]);
  });
});
