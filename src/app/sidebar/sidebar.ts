import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';
import { CompanySetupService } from '../services/company-setup.service';
import { CompanyContextService } from '../services/company-context.service';

interface MenuItem {
  icon: string;
  activeIcon?: string;
  label: string;
  route: string;
  module?: string;
  hasSubmenu?: boolean;
  action?: string | string[];
  submenu?: { label: string; route: string; module?: string | string[]; action?: string | string[] }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  @Input() mobileOpen = false;
  isCollapsed = false;
  expandedMenuLabel?: string;
  activeRoute = '/dashboard';
  showLogoutModal = false;
  @Output() mobileClose = new EventEmitter<void>();
  userName = 'User';

  // Path to your icons folder
  iconPath = '/assets/icons/';

  @Output() collapsedChange = new EventEmitter<boolean>();

  private readonly baseMenuItems: MenuItem[] = [
    {
      icon: 'radix-icons_dashboard.svg',
      activeIcon: 'radix-icons_dashboard (1).svg',
      label: 'Dashboard',
      route: '/dashboard',
      hasSubmenu: true,
      submenu: [
        { label: 'Maintenance Dashboard', route: '/dashboard' },
        { label: 'Security Dashboard', route: '/dashboard/security' },
        { label: 'Budget Dashboard', route: '/dashboard/budget' },
        { label: 'IoT Dashboard', route: '/dashboard/iot' }
      ]
    },
    {
      icon: 'fluent_web-asset-24-regular.svg',
      activeIcon: 'fluent_web-asset-24-regular (1).svg',
      label: 'Assets',
      route: '/assets',
      module: 'ASSET',
      hasSubmenu: true,
      submenu: [
        { label: 'Asset Type', route: '/assets/types', module: ['ASSET_TYPE', 'ASSET'] },
        { label: 'All Assets', route: '/assets', module: 'ASSET' }
      ]
    },
    {
      icon: 'carbon_collapse-categories.svg',
      activeIcon: 'carbon_collapse-categories-active.svg',
      label: 'Service Requests',
      route: '/service-requests',
      module: 'SERVICE_REQUEST'
    },
    {
      icon: 'fluent-mdl2_work-flow.svg',
      activeIcon: 'fluent-mdl2_work-flow (1).svg',
      label: 'Work Order',
      route: '/work-orders',
      module: 'WORK_ORDER',
      hasSubmenu: true,
      submenu: [
        { label: 'Work Order Type', route: '/work-orders/types', module: ['WORK_ORDER_TYPE', 'WORK_ORDER'] },
        { label: 'Work Order', route: '/work-orders', module: 'WORK_ORDER' }
        
      ]
    },
    {
      icon: 'streamline_hierarchy-10.svg',
      activeIcon: 'streamline_hierarchy-10 (1).svg',
      label: 'Maintenance',
      route: '/maintenance',
      module: 'PREVENTIVE_MAINTENANCE',
      hasSubmenu: true,
      submenu: [
        { label: 'Preventive', route: '/maintenance/preventive', module: 'PREVENTIVE_MAINTENANCE' },
        // { label: 'Predictive Maintenance', route: '/maintenance/predictive' },
        { label: 'Corrective', route: '/maintenance/emergency', module: ['EMERGENCY_MAINTENANCE', 'PREVENTIVE_MAINTENANCE'] }
      ]
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'IoT Monitoring',
      route: '/iot/devices',
      hasSubmenu: true,
      submenu: [
        { label: 'Devices', route: '/iot/devices' },
        { label: 'Alerts', route: '/iot/alerts' },
        { label: 'Rules', route: '/iot/rules' },
        { label: 'Metrics', route: '/iot/metrics' }
      ]
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'Inventory',
      route: '/inventory',
      module: 'INVENTORY',
      hasSubmenu: true,
      submenu: [
        { label: 'Warehouse', route: '/inventory/warehouse', module: ['WAREHOUSE', 'INVENTORY'] },
        { label: 'Inventory', route: '/inventory', module: 'INVENTORY' },
        { label: 'Inventory Reconcile', route: '/inventory/reconcile', module: ['INVENTORY_RECONCILE', 'INVENTORY'] },
        { label: 'Inventory Audit Logs', route: '/inventory/audit-logs', module: ['INVENTORY_AUDIT_LOGS', 'INVENTORY'] }
      ]
    },
    {
      icon: 'Icon.svg',
      activeIcon: 'Icon (1).svg',
      label: 'Vendor Management',
      route: '/vendor-management',
      module: 'VENDOR'
    },
    {
      icon: 'clarity_two-way-arrows-line.svg',
      activeIcon: 'clarity_two-way-arrows-line (1).svg',
      label: 'Procurement',
      route: '/procurement',
      module: 'PROCUREMENT',
      hasSubmenu: true,
      submenu: [
        { label: 'Material Requisition', route: '/procurement/material-requisitions', module: 'MATERIAL_REQUISITION' },
        { label: 'Purchase Order', route: '/procurement/purchase-orders', module: 'PURCHASE_ORDER' },
        { label: 'Goods Receipt (GRN)', route: '/procurement/goods-receipts', module: 'GOODS_RECEIPT_NOTE' },
        { label: 'Return Transaction', route: '/procurement/returns', module: ['RETURN_TRANSACTION', 'PROCUREMENT'] }
      ]
    },
    {
      icon: 'tec.svg',
      activeIcon: 'tec.svg',
      label: 'Technician / Team',
      route: '/technicians',
      module: 'TECHNICIAN',
      hasSubmenu: true,
        submenu: [
        { label: 'Technician', route: '/technicians', module: 'TECHNICIAN' },
        { label: 'Technician Team', route: '/technicians/teams', module: 'TECHNICIAN_TEAM' }
      ]
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'Reports',
      route: '/reports',
      module: 'REPORTS',
      hasSubmenu: true,
      submenu: [
        { label: 'Asset Report', route: '/reports/assets', module: 'REPORTS' },
        { label: 'Inventory Report', route: '/reports/inventory', module: 'REPORTS' },
        { label: 'Transaction Report', route: '/reports/transactions', module: 'REPORTS' },
        { label: 'Work Order Report', route: '/reports/work-orders', module: 'REPORTS' }
      ]
    },
    {
      icon: 'carbon_user-role.svg',
      activeIcon: 'carbon_user-role.svg',
      label: 'Security',
      route: '/roles-permissions',
      module: 'ROLES',
      hasSubmenu: true,
      submenu: [
        { label: 'Roles', route: '/roles-permissions', module: ['MANAGE_ROLES', 'ROLES'] },
        { label: 'Users', route: '/users', module: ['MANAGE_USERS', 'INVITE_USER'] },
        { label: 'MFA', route: '/security/mfa', module: ['MFA', 'MANAGE_USERS'] },
        { label: 'Security Report', route: '/security/report', module: ['SECURITY_REPORT', 'REPORTS'] }
      ]
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'Company',
      route: '/company'
    }
  ];

  constructor(
    private router: Router,
    private permissions: PermissionService,
    private authService: AuthService,
    private companySetupService: CompanySetupService,
    private companyContext: CompanyContextService
  ) {
    this.activeRoute = this.router.url || this.activeRoute;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.activeRoute = event.urlAfterRedirects || event.url;
        this.syncExpandedMenuForRoute();
      });
  }

  ngOnInit(): void {
    const name = this.permissions.getCurrentUserName();
    this.userName = name || 'User';
    this.syncExpandedMenuForRoute();
  }

  toggleSidebar() {
    if (this.mobileOpen) {
      this.mobileClose.emit();
      return;
    }
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  toggleSubmenu(item: MenuItem) {
    if (this.expandedMenuLabel === item.label) {
      this.expandedMenuLabel = undefined;
    } else {
      this.expandedMenuLabel = item.label;
    }
  }

  getIconPath(iconName: string): string {
    return `${this.iconPath}${iconName}`;
  }

  getMenuIconPath(item: MenuItem): string {
    const iconName = this.isMenuItemActive(item) && item.activeIcon ? item.activeIcon : item.icon;
    return this.getIconPath(iconName);
  }

  get menuItems(): MenuItem[] {
    return this.baseMenuItems.filter(item => {
      if (item.hasSubmenu) {
        return this.getVisibleSubmenu(item).length > 0;
      }
      return this.hasAccess(item.module, item.action);
    });
  }

  handleMenuClick(item: MenuItem, event: MouseEvent) {
    event.preventDefault();
    if (item.hasSubmenu && this.isCollapsed) {
      this.isCollapsed = false;
      this.collapsedChange.emit(this.isCollapsed);
      this.expandedMenuLabel = item.label;
      return;
    }

    if (item.hasSubmenu) {
      this.toggleSubmenu(item);
      const firstSub = this.getVisibleSubmenu(item)[0];
      if (firstSub) {
        this.navigateToRoute(firstSub.route);
      }
      return;
    }

    this.navigateToRoute(item.route);
  }

  selectSubmenu(sub: { label: string; route: string }, event: MouseEvent) {
    event.preventDefault();
    this.navigateToRoute(sub.route);
  }

  isMenuItemActive(item: MenuItem): boolean {
    if (item.hasSubmenu) {
      return false;
    }

    return (
      this.activeRoute === item.route ||
      this.activeRoute.startsWith(`${item.route}/`)
    );
  }

  isSubmenuActive(sub: { label: string; route: string }): boolean {
    return this.activeRoute === sub.route;
  }

  signOut(): void {
    this.showLogoutModal = true;
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    const token = localStorage.getItem('authToken') || '';
    this.authService.logout(token).subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
    localStorage.clear();
  }

  private finishLogout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('signupUserId');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('mfaEnabled');
    localStorage.removeItem('mfa_token');
    localStorage.removeItem('emailOtpVerified');
    localStorage.removeItem('authenticatorVerified');
    localStorage.removeItem('passwordExpired');
    localStorage.removeItem('daysUntilPasswordExpiry');
    localStorage.removeItem('userId');
    this.companySetupService.clear();
    this.companyContext.clear();
    this.permissions.clear();
    this.showLogoutModal = false;
    this.router.navigate(['/login']);
    this.closeMobileIfNeeded();
  }

  private closeMobileIfNeeded(): void {
    if (this.mobileOpen) {
      this.mobileClose.emit();
    }
  }

  private navigateToRoute(route: string): void {
    this.router.navigateByUrl(route).then(success => {
      if (success) {
        this.activeRoute = route;
        this.closeMobileIfNeeded();
        return;
      }
      this.activeRoute = this.router.url || this.activeRoute;
      console.warn('Sidebar navigation cancelled:', route);
    }).catch(err => {
      this.activeRoute = this.router.url || this.activeRoute;
      console.error('Sidebar navigation failed:', route, err);
    });
  }

  private syncExpandedMenuForRoute(): void {
    const match = this.menuItems.find(
      item =>
        item.hasSubmenu &&
        this.getVisibleSubmenu(item).some(
          sub => this.activeRoute === sub.route || this.activeRoute.startsWith(`${sub.route}/`)
        )
    );
    this.expandedMenuLabel = match?.label;
  }

  getVisibleSubmenu(item: MenuItem): { label: string; route: string; module?: string | string[]; action?: string | string[] }[] {
    const submenu = item.submenu || [];
    return submenu.filter(sub => this.hasAccess(sub.module, sub.action));
  }

  private hasAccess(module?: string | string[], action?: string | string[]): boolean {
    if (!module) {
      return true;
    }

    const modules = Array.isArray(module) ? module : [module];
    const actions = action ? (Array.isArray(action) ? action : [action]) : undefined;

    if (actions && actions.length) {
      return modules.some(mod => this.permissions.hasAnyPermission(mod, actions));
    }

    return modules.some((mod) => this.permissions.hasAnyPermission(mod));
  }
}


