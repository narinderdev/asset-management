import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DashboardService, SecurityDashboardPeriodData } from '../services/dashboard.service';

interface KpiCard {
  value: number;
  label: string;
}

interface UserActivityRow {
  action: string;
  user: string;
  performedBy: string;
  dateTime: string;
  status: string;
  details: string;
}

interface RolePermissionRow {
  action: string;
  roleName: string;
  performedBy: string;
  dateTime: string;
  addedPermissions: string;
  removedPermissions: string;
  details: string;
}

interface SecurityLogRow {
  eventType: string;
  category: string;
  targetType: string;
  targetName: string;
  performedBy: string;
  dateTime: string;
  result: string;
  details: string;
}

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-dashboard.html',
  styleUrl: './security-dashboard.css'
})
export class SecurityDashboardComponent implements OnInit {
  period = '';
  requestPeriod = 'THIS_WEEK';
  limit = 20;
  isLoading = false;
  errorMessage = '';
  systemStatusLabel = '';

  kpis: KpiCard[] = [];

  recentUserActivity: UserActivityRow[] = [];
  rolePermissionChanges: RolePermissionRow[] = [];
  securityLogs: SecurityLogRow[] = [];

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSecurityDashboard();
  }

  getStripeClass(index: number): string {
    const stripes = ['stripe-blue', 'stripe-amber', 'stripe-red', 'stripe-purple', 'stripe-green'];
    return stripes[index % stripes.length];
  }

  getActionChipClass(action: string): string {
    const key = (action ?? '').toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      LOGIN: 'chip-blue',
      LOGOUT: 'chip-slate',
      PWD_RESET: 'chip-purple',
      PASSWORD_RESET: 'chip-purple',
      MFA_ENROLL: 'chip-teal',
      DEACTIVATE: 'chip-orange',
      ROLE_CREATE: 'chip-green',
      ROLE_CREATED: 'chip-green',
      ROLE_DELETE: 'chip-red',
      ROLE_UPDATED: 'chip-blue',
      ROLE_PERMISSION_UPDATED: 'chip-purple',
      PERM_MODIFY: 'chip-blue',
      ROLE_CHANGE: 'chip-purple',
      DATA_EXPORT: 'chip-blue',
      POLICY_UPDATE: 'chip-teal',
      SUSPICIOUS: 'chip-orange',
      USER_CREATED: 'chip-green',
      AUTH_FAIL: 'chip-red',
      AUTH_FAILURE: 'chip-red',
      USER_REMOVED: 'chip-red',
      USER_DISABLED: 'chip-orange',
      USER_ENABLED: 'chip-green',
      USER_UPDATED: 'chip-blue'
    };
    return map[key] ?? 'chip-slate';
  }

  getAvatarClass(user: string): string {
    const char = (user ?? '').trim().charAt(0).toLowerCase();
    return `av-${char || 'u'}`;
  }

  private loadSecurityDashboard(): void {
    this.updateView(() => {
      this.isLoading = true;
      this.errorMessage = '';
      this.systemStatusLabel = '';
      this.period = '';
      this.kpis = [];
      this.recentUserActivity = [];
      this.rolePermissionChanges = [];
      this.securityLogs = [];
    });
    this.dashboardService
      .fetchSecurityDashboard(this.requestPeriod, this.limit)
      .pipe(finalize(() => {
        this.updateView(() => {
          this.isLoading = false;
        });
      }))
      .subscribe({
        next: (response) => {
          const data = response.data;
          const selected: SecurityDashboardPeriodData | undefined = this.extractPeriodData(data);

          if (!selected) {
            this.updateView(() => {
              this.errorMessage = response.message || 'No security dashboard data available.';
            });
            return;
          }

          this.updateView(() => {
            this.systemStatusLabel = this.toDisplayText(response.message || '');
            this.bindPeriodData(selected);
          });
        },
        error: () => {
          this.updateView(() => {
            this.errorMessage = 'Unable to load security dashboard data.';
          });
        }
      });
  }

  private bindPeriodData(data: SecurityDashboardPeriodData): void {
    this.period = this.toDisplayText(data.period || 'THIS_WEEK');
    const summary = data.kpiSummary ?? {};
    this.kpis = [
      { value: summary.newUsersAdded ?? 0, label: 'New Users Added' },
      { value: summary.usersRemovedOrDisabled ?? 0, label: 'Users Removed / Disabled' },
      { value: summary.newRolesAdded ?? 0, label: 'New Roles Added' },
      { value: summary.roleChanges ?? 0, label: 'Role Changes' },
      { value: summary.permissionChanges ?? 0, label: 'Permission Changes' }
    ];

    this.recentUserActivity = (data.recentUserActivity ?? []).map((row) => ({
      action: this.toDisplayText(row.actionType || '-'),
      user: row.targetUserName || '-',
      performedBy: row.performedBy || '-',
      dateTime: this.formatDateTime(row.dateTime),
      status: this.normalizeState(row.status),
      details: row.details || '-'
    }));

    this.rolePermissionChanges = (data.rolePermissionChanges ?? []).map((row) => ({
      action: this.toDisplayText(row.actionType || '-'),
      roleName: row.roleName || '-',
      performedBy: row.performedBy || '-',
      dateTime: this.formatDateTime(row.dateTime),
      addedPermissions: this.toDisplayText((row.addedPermissions ?? []).join(', ') || '-'),
      removedPermissions: this.toDisplayText((row.removedPermissions ?? []).join(', ') || '-'),
      details: this.toDisplayText(row.details || '-')
    }));

    this.securityLogs = (data.securityLog ?? []).map((row) => ({
      eventType: this.toDisplayText(row.eventType || '-'),
      category: this.toDisplayText(row.category || '-'),
      targetType: this.toDisplayText(row.targetType || '-'),
      targetName: row.targetName || '-',
      performedBy: row.performedBy || '-',
      dateTime: this.formatDateTime(row.dateTime),
      result: this.toDisplayText(this.normalizeState(row.result)),
      details: this.toDisplayText(row.details || '-')
    }));
  }

  private normalizeState(value?: string): string {
    return (value || '-').toUpperCase();
  }

  private toDisplayText(value: string): string {
    return value.replace(/_/g, ' ');
  }

  private formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return value;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private extractPeriodData(data: unknown): SecurityDashboardPeriodData | undefined {
    const value = data as any;
    if (!value) {
      return undefined;
    }

    // Supports response shape: { data: { slice: { ...periodData } } }
    if (value.slice && (value.slice.kpiSummary || value.slice.recentUserActivity || value.slice.rolePermissionChanges || value.slice.securityLog)) {
      return value.slice as SecurityDashboardPeriodData;
    }

    // Supports response containing one period directly in "data"
    if (value.kpiSummary || value.recentUserActivity || value.rolePermissionChanges || value.securityLog) {
      return value as SecurityDashboardPeriodData;
    }

    // Supports response containing grouped periods (thisWeek/thisMonth/thisYear)
    return value?.thisWeek
      ?? value?.this_week
      ?? value?.thisMonth
      ?? value?.this_month
      ?? value?.thisYear
      ?? value?.this_year;
  }

  private updateView(updater: () => void): void {
    this.ngZone.run(() => {
      updater();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }
}
