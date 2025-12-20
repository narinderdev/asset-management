import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface MenuItem {
  icon: string;
  activeIcon?: string;
  label: string;
  route: string;
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
export class SidebarComponent {
  @Input() mobileOpen = false;
  isCollapsed = false;
  expandedMenuLabel?: string;
  activeRoute = '/dashboard';
  @Output() mobileClose = new EventEmitter<void>();

  // Path to your icons folder
  iconPath = '/assets/icons/';

  @Output() collapsedChange = new EventEmitter<boolean>();

  menuItems: MenuItem[] = [
    {
      icon: 'radix-icons_dashboard.svg',
      activeIcon: 'radix-icons_dashboard (1).svg',
      label: 'Dashboard',
      route: '/dashboard'
    },
    {
      icon: 'fluent_web-asset-24-regular.svg',
      label: 'Assets',
      route: '/assets',
      hasSubmenu: true,
      submenu: [{ label: 'All Assets', route: '/assets' }]
    },
    {
      icon: 'carbon_collapse-categories.svg',
      activeIcon: 'carbon_collapse-categories-active.svg',
      label: 'Service Requests',
      route: '/service-requests'
    },
    {
      icon: 'fluent-mdl2_work-flow.svg',
      activeIcon: 'fluent-mdl2_work-flow (1).svg',
      label: 'Work Orders',
      route: '/work-orders'
    },
    {
      icon: 'streamline_hierarchy-10.svg',
      activeIcon: 'streamline_hierarchy-10 (1).svg',
      label: 'Preventive Maintenance',
      route: '/preventive-maintenance'
    },
    {
      icon: 'proicons_document.svg',
      activeIcon: 'proicons_document (1).svg',
      label: 'Inventory',
      route: '/inventory'
    },
    {
      icon: 'Icon.svg',
      activeIcon: 'Icon (1).svg',
      label: 'Vendor Management',
      route: '/vendor-management'
    },
    {
      icon: 'clarity_two-way-arrows-line.svg',
      activeIcon: 'clarity_two-way-arrows-line (1).svg',
      label: 'Procurement',
      route: '/procurement',
      hasSubmenu: true,
      submenu: [
        { label: 'Material Requisitions', route: '/procurement/material-requisitions' },
        { label: 'Purchase Orders', route: '/procurement/purchase-orders' },
        { label: 'Goods Receipts (GRN)', route: '/procurement/goods-receipts' }
      ]
    },
    {
      icon: 'tec.svg',
      activeIcon: 'tec.svg',
      label: 'Technician / Teams',
      route: '/technicians',
      hasSubmenu: true,
        submenu: [
        { label: 'Technician', route: '/technicians' },
        { label: 'Technician Teams', route: '/technicians/teams' }
      ]
    },
    {
      icon: 'carbon_user-role.svg',
      activeIcon: 'carbon_user-role (1).svg',
      label: 'Roles & Permissions',
      route: '/roles-permissions'
    }
  ];

  constructor(private router: Router) {
    this.activeRoute = this.router.url || this.activeRoute;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.activeRoute = event.urlAfterRedirects || event.url;
      });
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

  handleMenuClick(item: MenuItem, event: MouseEvent) {
    event.preventDefault();
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
    return (
      this.activeRoute === item.route ||
      this.activeRoute.startsWith(`${item.route}/`)
    );
  }

  isSubmenuActive(sub: { label: string; route: string }): boolean {
    return this.activeRoute === sub.route;
  }

  private closeMobileIfNeeded(): void {
    if (this.mobileOpen) {
      this.mobileClose.emit();
    }
  }
}
