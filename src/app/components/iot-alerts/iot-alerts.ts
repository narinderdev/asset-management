import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import {
  IotAlert,
  IotAlertActionPayload,
  IotAlertService,
  IotAlertSeverity,
  IotAlertStatus
} from '../../services/iot-alert.service';
import { Loader } from '../loader/loader';

type ActionType = 'ACK' | 'RESOLVE' | 'SUPPRESS';

@Component({
  selector: 'app-iot-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './iot-alerts.html',
  styleUrl: './iot-alerts.css'
})
export class IotAlertsComponent implements OnInit {
  alerts: IotAlert[] = [];
  totalAlerts = 0;
  currentPage = 0;
  itemsPerPage = 10;

  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;
  loadingRows = Array.from({ length: 5 });

  activeAction?: { type: ActionType; alert: IotAlert };
  isActionModalOpen = false;
  isActionSubmitting = false;
  actionForm = {
    reason: '',
    suppressedUntil: ''
  };

  constructor(
    private readonly iotAlertService: IotAlertService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.iotAlertService
      .fetchAlerts({
        page: this.currentPage,
        size: this.itemsPerPage
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.alerts = response.data?.content ?? [];
          this.totalAlerts = response.data?.totalElements ?? this.alerts.length;

          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          if (typeof response.data?.page === 'number') {
            this.currentPage = response.data.page;
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.alerts = [];
          this.totalAlerts = 0;
          this.errorMessage = 'Unable to load IoT alerts.';
          this.toastr.error('Unable to load IoT alerts. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadAlerts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadAlerts();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalAlerts / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalAlerts) {
      return 0;
    }

    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalAlerts) {
      return 0;
    }

    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalAlerts);
  }

  canAcknowledge(status?: IotAlertStatus): boolean {
    return status === 'ACTIVE';
  }

  canResolve(status?: IotAlertStatus): boolean {
    return status === 'ACTIVE' || status === 'ACKNOWLEDGED' || status === 'SUPPRESSED';
  }

  canSuppress(status?: IotAlertStatus): boolean {
    return status === 'ACTIVE' || status === 'ACKNOWLEDGED';
  }

  openActionModal(type: ActionType, alert: IotAlert): void {
    this.activeAction = { type, alert };
    this.isActionModalOpen = true;
    this.actionForm.reason = '';
    this.actionForm.suppressedUntil = '';

    if (type === 'SUPPRESS') {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      this.actionForm.suppressedUntil = this.toLocalDateTimeInputValue(nextHour);
    }
  }

  closeActionModal(): void {
    this.isActionModalOpen = false;
    this.activeAction = undefined;
    this.isActionSubmitting = false;
  }

  submitAction(): void {
    if (!this.activeAction?.alert.id || this.isActionSubmitting) {
      return;
    }

    const payload = this.buildActionPayload(this.activeAction.type);
    if (!payload) {
      return;
    }

    const alertId = this.activeAction.alert.id;
    const operation = this.activeAction.type === 'ACK'
      ? this.iotAlertService.acknowledgeAlert(alertId, payload)
      : this.activeAction.type === 'RESOLVE'
        ? this.iotAlertService.resolveAlert(alertId, payload)
        : this.iotAlertService.suppressAlert(alertId, payload);

    this.isActionSubmitting = true;

    operation
      .pipe(
        finalize(() => {
          this.isActionSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const label = this.activeAction?.type === 'ACK'
            ? 'acknowledged'
            : this.activeAction?.type === 'RESOLVE'
              ? 'resolved'
              : 'suppressed';
          this.toastr.success(`Alert ${label} successfully.`);
          this.closeActionModal();
          this.loadAlerts();
        },
        error: () => {
          this.toastr.error('Unable to update alert. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  getSeverityClass(severity?: IotAlertSeverity): string {
    switch (severity) {
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

  getStatusClass(status?: IotAlertStatus): string {
    switch (status) {
      case 'ACKNOWLEDGED':
        return 'status-acknowledged';
      case 'SUPPRESSED':
        return 'status-suppressed';
      case 'RESOLVED':
      case 'AUTO_RESOLVED':
        return 'status-resolved';
      default:
        return 'status-active';
    }
  }

  formatSeverity(value?: IotAlertSeverity): string {
    if (!value) {
      return '-';
    }

    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  formatStatus(value?: IotAlertStatus): string {
    if (!value) {
      return '-';
    }

    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
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

  getActionTitle(): string {
    if (this.activeAction?.type === 'ACK') {
      return 'Acknowledge Alert';
    }
    if (this.activeAction?.type === 'RESOLVE') {
      return 'Resolve Alert';
    }
    return 'Suppress Alert';
  }

  getActionButtonLabel(): string {
    if (this.activeAction?.type === 'ACK') {
      return 'Acknowledge';
    }
    if (this.activeAction?.type === 'RESOLVE') {
      return 'Resolve';
    }
    return 'Suppress';
  }

  private buildActionPayload(type: ActionType): IotAlertActionPayload | null {
    const reason = this.actionForm.reason.trim();

    if (type === 'SUPPRESS') {
      if (!this.actionForm.suppressedUntil) {
        this.toastr.error('Suppressed until date/time is required.');
        return null;
      }

      return {
        reason: reason || 'Suppressed from web UI',
        suppressedUntil: new Date(this.actionForm.suppressedUntil).toISOString()
      };
    }

    return {
      reason: reason || (type === 'ACK' ? 'Acknowledged from web UI' : 'Resolved from web UI')
    };
  }

  private toLocalDateTimeInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
}
