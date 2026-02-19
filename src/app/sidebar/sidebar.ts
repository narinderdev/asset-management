import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';

interface MenuItem {
  icon: string;
  activeIcon?: string;
  label: string;
  route: string;
  module?: string;
  hasSubmenu?: boolean;
  submenu?: { label: string; route: string }[];
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
        { label: 'Budget Dashboard', route: '/dashboard/budget' }
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
        { label: 'Asset Type', route: '/assets/types' },
        { label: 'All Assets', route: '/assets' }
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
        { label: 'Work Order Types', route: '/work-orders/types' },
        { label: 'Work Order', route: '/work-orders' }
        
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
        { label: 'Preventative', route: '/maintenance/preventive' },
        // { label: 'Predictive Maintenance', route: '/maintenance/predictive' },
        { label: 'Corrective Maintenance', route: '/maintenance/emergency' }
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
        { label: 'Warehouse', route: '/inventory/warehouse' },
        { label: 'Inventory', route: '/inventory' },
        { label: 'Inventory Reconcile', route: '/inventory/reconcile' },
        { label: 'Inventory Audit Logs', route: '/inventory/audit-logs' }
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
        { label: 'Material Requisition', route: '/procurement/material-requisitions' },
        { label: 'Purchase Order', route: '/procurement/purchase-orders' },
        { label: 'Goods Receipt (GRN)', route: '/procurement/goods-receipts' },
        { label: 'Return Transaction', route: '/procurement/returns' }
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
        { label: 'Technician', route: '/technicians' },
        { label: 'Technician Team', route: '/technicians/teams' }
      ]
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'Reports',
      route: '/reports',
      hasSubmenu: true,
      submenu: [
        { label: 'Asset Report', route: '/reports/assets' },
        { label: 'Inventory Report', route: '/reports/inventory' },
        { label: 'Transaction Report', route: '/reports/transactions' },
        { label: 'Work Order Report', route: '/reports/work-orders' }
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
        { label: 'Roles', route: '/roles-permissions' },
        { label: 'Users', route: '/users' },
        { label: 'MFA', route: '/security/mfa' }
      ]
    },
    {
      icon: 'tm-system.svg',
      activeIcon: 'tm-system.svg',
      label: 'TM System',
      route: '/tm-system'
    }
  ];

  constructor(
    private router: Router,
    private permissions: PermissionService,
    private authService: AuthService
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
    const allowed = this.permissions.getAllowedModules();
    if (!allowed || !allowed.length) {
      return this.baseMenuItems;
    }
    const allowedSet = new Set(allowed.map((a: string) => a.toUpperCase()));
    return this.baseMenuItems.filter(item => {
      if (!item.module) {
        return true;
      }
      return allowedSet.has(item.module.toUpperCase());
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
      const firstSub = item.submenu?.[0];
      if (firstSub) {
        this.activeRoute = firstSub.route;
        this.router.navigateByUrl(firstSub.route);
        this.closeMobileIfNeeded();
      }
      return;
    }

    this.router.navigateByUrl(item.route);
    this.activeRoute = item.route;
    this.closeMobileIfNeeded();
  }

  selectSubmenu(sub: { label: string; route: string }, event: MouseEvent) {
    event.preventDefault();
    this.activeRoute = sub.route;
    this.router.navigateByUrl(sub.route);
    this.closeMobileIfNeeded();
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
  }

  private finishLogout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('signupUserId');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('mfaEnabled');
    localStorage.removeItem('passwordExpired');
    localStorage.removeItem('daysUntilPasswordExpiry');
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

  private syncExpandedMenuForRoute(): void {
    const match = this.menuItems.find(
      item =>
        item.hasSubmenu &&
        item.submenu?.some(
          sub => this.activeRoute === sub.route || this.activeRoute.startsWith(`${sub.route}/`)
        )
    );
    this.expandedMenuLabel = match?.label;
  }
}
