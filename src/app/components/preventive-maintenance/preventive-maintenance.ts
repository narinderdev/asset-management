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
  pmId: string;
  name: string;
  type: string;
  appliesTo: string;
  frequency: string;
  autoGenerate: boolean;
  nextDue: string;
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

  constructor(
    private router: Router,
    private pmTemplateService: PmTemplateService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
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

    this.pmTemplateService
      .fetchTemplates(0, 20)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.templates = content.map(template => this.mapTemplate(template));
        },
        error: () => {
          this.errorMessage = 'Unable to load preventive maintenance templates. Please try again later.';
        }
      });
  }

  private mapTemplate(template: {
    id?: number;
    pmId?: string;
    pmName?: string;
    pmType?: string;
    appliesToType?: string;
    frequencyValue?: number;
    timeUnit?: string;
    autoGenerateWo?: boolean;
    nextDueDate?: string;
  }): PreventiveMaintenanceTemplate {
    return {
      id: template.id,
      pmId: template.pmId ?? '—',
      name: template.pmName ?? 'Unnamed Template',
      type: this.prettify(template.pmType),
      appliesTo: template.appliesToType ?? 'Assets',
      frequency: this.describeFrequency(template.frequencyValue, template.timeUnit),
      autoGenerate: Boolean(template.autoGenerateWo),
      nextDue: this.formatDate(template.nextDueDate)
    };
  }

  private describeFrequency(value?: number, unit?: string): string {
    if (!value) {
      return unit ?? '—';
    }

    const normalizedUnit = unit ? this.prettify(unit) : 'Days';
    return `${value} ${normalizedUnit}`;
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private prettify(value?: string): string {
    if (!value) {
      return '—';
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
    this.router.navigate(['/preventive-maintenance/create']);
  }

  viewTemplate(template: PreventiveMaintenanceTemplate): void {
    const id = template.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/preventive-maintenance/view', id]);
  }

  editTemplate(template: PreventiveMaintenanceTemplate): void {
    if (!this.canEditPm) {
      return;
    }
    const id = template.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/preventive-maintenance/edit', id]);
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

    this.isDeleting = true;

    this.pmTemplateService.deleteTemplate(this.templateToDelete.id).pipe(
      finalize(() => {
        this.isDeleting = false;
      })
    ).subscribe({
      next: () => {
        this.toastr.success('Preventive maintenance template deleted.');
        this.closeDeleteModal();
        this.loadTemplates();
      },
      error: () => {
        this.toastr.error('Unable to delete template. Please try again.');
        this.closeDeleteModal();
      }
    });
  }
}
