import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { IotDashboardRecentIssue, IotDashboardService } from '../services/iot-dashboard.service';

@Component({
  selector: 'app-iot-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './iot-dashboard.html',
  styleUrl: './iot-dashboard.css'
})
export class IotDashboardComponent implements OnInit {
  dashboardLoading = false;
  dashboardError?: string;

  dashboard = {
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    recentIssues: [] as IotDashboardRecentIssue[]
  };

  constructor(
    private readonly iotDashboardService: IotDashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.dashboardError = undefined;

    this.iotDashboardService
      .fetchDashboard()
      .pipe(
        finalize(() => {
          this.dashboardLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const data = response.data;
          this.dashboard = {
            totalDevices: data?.totalDevices ?? 0,
            onlineDevices: data?.onlineDevices ?? 0,
            offlineDevices: data?.offlineDevices ?? 0,
            activeAlerts: data?.activeAlerts ?? 0,
            criticalAlerts: data?.criticalAlerts ?? 0,
            recentIssues: data?.recentIssues ?? []
          };
          this.cdr.detectChanges();
        },
        error: () => {
          this.dashboard = {
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            activeAlerts: 0,
            criticalAlerts: 0,
            recentIssues: []
          };
          this.dashboardError = 'Unable to load IoT dashboard summary.';
          this.cdr.detectChanges();
        }
      });
  }

  formatIssueSeverity(value?: string): string {
    if (!value) {
      return '-';
    }
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  getIssueSeverityClass(value?: string): string {
    switch (value) {
      case 'CRITICAL':
        return 'severity-critical';
      case 'HIGH':
        return 'severity-high';
      case 'MEDIUM':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
