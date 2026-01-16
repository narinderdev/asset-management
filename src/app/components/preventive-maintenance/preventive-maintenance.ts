import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { PmTemplateService } from '../../services/pm-template.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

interface PreventiveMaintenanceTemplate {
  id?: number;
  title: string;
  active: boolean;
  assetName: string;
  location: string;
  startDate: string;
  priority: string;
}

@Component({
  selector: 'app-preventive-maintenance',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './preventive-maintenance.html',
  styleUrls: ['./preventive-maintenance.css']
})
export class PreventiveMaintenanceComponent implements OnInit {
  templates: PreventiveMaintenanceTemplate[] = [];
  isLoading = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  templateToDelete?: PreventiveMaintenanceTemplate;
  isDeleting = false;
  canCreatePm = false;
  canEditPm = false;
  canDeletePm = false;
  headingText = 'Preventive Maintenance Template';
  createButtonText = '+ Create Preventive Maintenance Template';
  deleteMessage = 'Are you sure you want to delete this preventive maintenance template?';
  isPredictiveMode = false;
  isEmergencyMode = false;
  emptyStateText = 'No preventive maintenance templates to display.';

  constructor(
    private router: Router,
    private pmTemplateService: PmTemplateService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.isPredictiveMode = this.router.url.includes('/maintenance/predictive');
    this.isEmergencyMode = this.router.url.includes('/maintenance/emergency');
    if (this.isPredictiveMode) {
      this.headingText = 'Predictive Maintenance';
      this.createButtonText = '+ Create Predictive Maintenance';
      this.emptyStateText = 'No predictive maintenance items to display.';
      this.deleteMessage = 'Are you sure you want to delete this predictive maintenance item?';
    } else if (this.isEmergencyMode) {
      this.headingText = 'Emergency Maintenance';
      this.createButtonText = '+ Create Emergency Maintenance';
      this.emptyStateText = 'No emergency maintenance items to display.';
      this.deleteMessage = 'Delete is not available for emergency maintenance.';
    } else {
      this.emptyStateText = 'No preventive maintenance templates to display.';
      this.deleteMessage = 'Are you sure you want to delete this preventive maintenance template?';
    }
    this.loadTemplates();
  }

  private setPermissions(): void {
    this.canCreatePm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'CREATE');
    this.canEditPm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'UPDATE');
    this.canDeletePm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'DELETE');
  }

  private loadTemplates(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    if (this.isPredictiveMode) {
      this.pmTemplateService
        .fetchPredictiveThresholds(0, 20)
        .pipe(finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: response => {
            const content: Array<{
              id?: number;
              assetId?: number;
              assetName?: string;
              meterType?: string;
              autoCreateWo?: boolean;
              defaultPriority?: string;
              meterReadings?: Array<{ readingTime?: string }>;
            }> = (response.data as any)?.thresholds ?? response.data?.content ?? [];
            this.templates = content.map(template => this.mapPredictive(template));
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorMessage = 'Unable to load predictive maintenance items. Please try again later.';
            this.cdr.detectChanges();
          }
        });
    } else if (this.isEmergencyMode) {
      this.pmTemplateService
        .fetchEmergencyMaintenance(0, 20)
        .pipe(finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: response => {
            const incidents = response.data?.incidents ?? [];
            this.templates = incidents.map(incident => this.mapEmergency(incident));
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorMessage = 'Unable to load emergency maintenance items. Please try again later.';
            this.cdr.detectChanges();
          }
        });
    } else {
      this.pmTemplateService
        .fetchPreventiveMaintenance(0, 20)
        .pipe(finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: response => {
            const content = response.data?.content ?? [];
            this.templates = content.map(template => this.mapTemplate(template));
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorMessage = 'Unable to load preventive maintenance templates. Please try again later.';
            this.cdr.detectChanges();
          }
        });
    }
  }

  private mapTemplate(template: {
    id?: number;
    assetId?: number;
    assetName?: string;
    pmId?: string;
    pmName?: string;
    title?: string;
    pmType?: string;
    workType?: string;
    appliesToType?: string;
    location?: string;
    frequencyValue?: number;
    intervalValue?: number;
    timeUnit?: string;
    intervalUnit?: string;
    autoGenerateWo?: boolean;
    nextDueDate?: string;
    startDate?: string;
    priority?: string;
    active?: boolean;
  }): PreventiveMaintenanceTemplate {
    return {
      id: template.id,
      title: template.title ?? template.pmName ?? 'N/A',
      active: Boolean(template.active),
      assetName: template.assetName ?? (template.assetId ? `Asset ${template.assetId}` : 'N/A'),
      location: template.location ?? template.appliesToType ?? 'N/A',
      startDate: this.formatDate(template.startDate),
      priority: this.prettify(template.priority ?? 'N/A')
    };
  }

  private mapEmergency(incident: {
    id?: number;
    assetId?: number;
    assetName?: string;
    location?: string;
    failureDescription?: string;
    failureTime?: string;
    workOrder?: {
      priority?: string;
    };
  }): PreventiveMaintenanceTemplate {
    return {
      id: incident.id,
      title: incident.failureDescription ?? incident.workOrder?.priority ?? 'N/A',
      active: true,
      assetName: incident.assetName ?? (incident.assetId ? `Asset ${incident.assetId}` : 'N/A'),
      location: incident.location ?? 'N/A',
      startDate: this.formatDate(incident.failureTime),
      priority: this.prettify(incident.workOrder?.priority ?? 'N/A')
    };
  }

  private mapPredictive(template: {
    id?: number;
    assetId?: number;
    assetName?: string;
    meterType?: string;
    autoCreateWo?: boolean;
    defaultPriority?: string;
    meterReadings?: Array<{
      readingTime?: string;
    }>;
  }): PreventiveMaintenanceTemplate {
    const latestReadingTime = template.meterReadings?.[0]?.readingTime;

    return {
      id: template.id,
      title: template.assetName ?? (template.assetId ? `Asset ${template.assetId}` : 'N/A'),
      active: Boolean(template.autoCreateWo),
      assetName: template.assetName ?? 'N/A',
      location: 'N/A',
      startDate: this.formatDate(latestReadingTime),
      priority: this.prettify(template.defaultPriority ?? 'N/A')
    };
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private prettify(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  createServiceRequest(): void {
    if (!this.canCreatePm) {
      return;
    }
    if (this.isPredictiveMode) {
      this.router.navigate(['/predictive-maintenance/create']);
    } else if (this.isEmergencyMode) {
      this.router.navigate(['/emergency-maintenance/create']);
    } else {
      this.router.navigate(['/preventive-maintenance/create']);
    }
  }

  viewTemplate(template: PreventiveMaintenanceTemplate): void {
    const id = template.id;
    if (!id) {
      return;
    }

    if (this.isPredictiveMode) {
      this.router.navigate(['/predictive-maintenance/view', id]);
    } else if (this.isEmergencyMode) {
      this.router.navigate(['/emergency-maintenance/view', id]);
    } else {
      this.router.navigate(['/preventive-maintenance/view', id]);
    }
  }

  editTemplate(template: PreventiveMaintenanceTemplate): void {
    if (!this.canEditPm) {
      return;
    }
    const id = template.id;
    if (!id) {
      return;
    }

    if (this.isPredictiveMode) {
      this.router.navigate(['/predictive-maintenance/edit', id]);
    } else if (this.isEmergencyMode) {
      this.router.navigate(['/emergency-maintenance/edit', id]);
    } else {
      this.router.navigate(['/preventive-maintenance/edit', id]);
    }
  }

  promptDeleteTemplate(template: PreventiveMaintenanceTemplate): void {
    if (!this.canDeletePm) {
      return;
    }
    this.templateToDelete = template;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.templateToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDeleteTemplate(): void {
    if (!this.canDeletePm || !this.templateToDelete?.id) {
      return;
    }

    if (this.isEmergencyMode) {
      this.toastr.error('Delete is not available for this maintenance type yet.');
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;

    const delete$ = this.isPredictiveMode
      ? this.pmTemplateService.deletePredictiveThreshold(this.templateToDelete.id)
      : this.pmTemplateService.deletePreventiveMaintenance(this.templateToDelete.id);

    delete$.pipe(
      finalize(() => {
        this.isDeleting = false;
      })
    ).subscribe({
      next: () => {
        this.toastr.success(this.isPredictiveMode ? 'Predictive maintenance item deleted.' : 'Preventive maintenance template deleted.');
        this.closeDeleteModal();
        this.loadTemplates();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Unable to delete template. Please try again.');
        this.closeDeleteModal();
        this.cdr.detectChanges();
      }
    });
  }
}
