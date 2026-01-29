import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { PmTemplateService } from '../../services/pm-template.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

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
  imports: [CommonModule, HttpClientModule, DeleteModalComponent, Loader],
  templateUrl: './preventive-maintenance.html',
  styleUrls: ['./preventive-maintenance.css']
})
export class PreventiveMaintenanceComponent implements OnInit {
  templates: PreventiveMaintenanceTemplate[] = [];
  totalTemplates = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  errorMessage?: string;
  hasLoaded = false;
  isDeleteModalOpen = false;
  templateToDelete?: PreventiveMaintenanceTemplate;
  isDeleting = false;
  canCreatePm = false;
  canEditPm = false;
  canDeletePm = false;
  headingText = 'Preventative Maintenance Template';
  createButtonText = '+ Create Preventative Maintenance Template';
  deleteMessage = 'Are you sure you want to delete this preventative maintenance template?';
  isPredictiveMode = false;
  isEmergencyMode = false;
  emptyStateText = 'No Preventative maintenance templates to display.';

  constructor(
    private router: Router,
    private pmTemplateService: PmTemplateService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService,
    private zone: NgZone
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
      this.emptyStateText = 'No Preventative maintenance templates to display.';
      this.deleteMessage = 'Are you sure you want to delete this Preventative maintenance template?';
    }
    this.loadTemplates();
  }

  private setPermissions(): void {
    this.canCreatePm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'CREATE');
    this.canEditPm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'UPDATE');
    this.canDeletePm = this.permissionService.hasPermission('PREVENTIVE_MAINTENANCE', 'DELETE');
  }

  private loadTemplates(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    this.templates = [];

    if (this.isPredictiveMode) {
      this.pmTemplateService
        .fetchPredictiveThresholds(pageIndex, this.itemsPerPage)
        .pipe(finalize(() => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }))
        .subscribe({
          next: response => {
            this.zone.run(() => {
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
              this.totalTemplates = response.data?.totalElements ?? this.templates.length;
              const apiSize = (response.data as any)?.size;
              if (typeof apiSize === 'number' && apiSize > 0) {
                this.itemsPerPage = apiSize;
              }
              const apiPage = (response.data as any)?.page ?? (response.data as any)?.number;
              if (typeof apiPage === 'number') {
                this.currentPage = apiPage;
              }
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => {
              this.errorMessage = undefined;
              this.toastr.error('Unable to load predictive maintenance items. Please try again later.');
              this.templates = [];
              this.totalTemplates = 0;
              this.cdr.detectChanges();
            });
          }
        });
    } else if (this.isEmergencyMode) {
      this.pmTemplateService
        .fetchEmergencyMaintenance(pageIndex, this.itemsPerPage)
        .pipe(finalize(() => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }))
        .subscribe({
          next: response => {
            this.zone.run(() => {
              const incidents = response.data?.incidents ?? [];
              this.templates = incidents.map(incident => this.mapEmergency(incident));
              this.totalTemplates = response.data?.totalElements ?? this.templates.length;
              const apiSize = (response.data as any)?.size;
              if (typeof apiSize === 'number' && apiSize > 0) {
                this.itemsPerPage = apiSize;
              }
              const apiPage = (response.data as any)?.page ?? (response.data as any)?.number;
              if (typeof apiPage === 'number') {
                this.currentPage = apiPage;
              }
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => {
              this.errorMessage = undefined;
              this.toastr.error('Unable to load emergency maintenance items. Please try again later.');
              this.templates = [];
              this.totalTemplates = 0;
              this.cdr.detectChanges();
            });
          }
        });
    } else {
      this.pmTemplateService
        .fetchPreventiveMaintenance(pageIndex, this.itemsPerPage)
        .pipe(finalize(() => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }))
        .subscribe({
          next: response => {
            this.zone.run(() => {
              const content = response.data?.content ?? [];
              this.templates = content.map(template => this.mapTemplate(template));
              this.totalTemplates = response.data?.totalElements ?? this.templates.length;
              const apiSize = (response.data as any)?.size;
              if (typeof apiSize === 'number' && apiSize > 0) {
                this.itemsPerPage = apiSize;
              }
              const apiPage = (response.data as any)?.page ?? (response.data as any)?.number;
              if (typeof apiPage === 'number') {
                this.currentPage = apiPage;
              }
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => {
              this.errorMessage = undefined;
              this.toastr.error('Unable to load preventive maintenance templates. Please try again later.');
              this.templates = [];
              this.totalTemplates = 0;
              this.cdr.detectChanges();
            });
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
        this.toastr.success(this.isPredictiveMode ? 'Predictive maintenance item deleted.' : 'Preventative maintenance template deleted.');
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

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadTemplates();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadTemplates();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalTemplates / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalTemplates) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalTemplates) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalTemplates);
  }
}
