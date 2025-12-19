import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import {
  PmTemplateService,
  CreatePmTemplatePayload,
  PmTemplateDetailResponse
} from '../../services/pm-template.service';
import { AssetsService } from '../../services/assets.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface SelectOption {
  label: string;
  value: string | number | boolean;
}

interface PmTemplateForm {
  pmId: string;
  pmName: string;
  pmType: string;
  appliesToType: string;
  assetDbId: number | null;
  assetCategory: string;
  planStartDate: string;
  planEndDate: string;
  frequencyType: string;
  frequencyValue: string;
  timeUnit: string;
  meterUnit: string;
  graceDays: string;
  generateWOAutomatically: string;
  leadTimeDays: string;
  linkedWorkType: string;
  defaultPriority: string;
}

@Component({
  selector: 'app-create-preventive-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-preventive-maintenance.html',
  styleUrls: ['./create-preventive-maintenance.css']
})
export class CreatePreventiveMaintenanceComponent implements OnInit {
  dateToday = new Date().toISOString().split('T')[0];

  template: PmTemplateForm = this.createTemplateDefaults();
  autoGeneratePmId = false;

  isSubmitting = false;
  errorMessage?: string;
  isLoadingDetails = false;
  hasLoadedDetails = false;
  isEditMode = false;
  editTemplateId?: number;

  assetOptions: Array<{ id: number; label: string }> = [];

  pmTypeOptions: SelectOption[] = [
    { label: 'Inspection', value: 'INSPECTION' },
    { label: 'Lubrication', value: 'LUBRICATION' },
    { label: 'Calibration', value: 'CALIBRATION' },
    { label: 'Overhaul', value: 'OVERHAUL' },
    { label: 'Other', value: 'OTHER' }
  ];
  appliesToOptions: SelectOption[] = [
    { label: 'Asset', value: 'ASSET' },
    { label: 'Category', value: 'CATEGORY' }
  ];
  frequencyTypeOptions: SelectOption[] = [
    { label: 'Time Based', value: 'TIME_BASED' },
    { label: 'Meter Based', value: 'METER_BASED' }
  ];
  generateOptions: SelectOption[] = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
  ];
  workTypeOptions: SelectOption[] = [
    { label: 'Preventive', value: 'PREVENTIVE' },
    { label: 'Corrective', value: 'CORRECTIVE' },
    { label: 'Predictive', value: 'PREDICTIVE' }
  ];
  priorityOptions: SelectOption[] = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];
  timeUnitOptions: SelectOption[] = [
    { label: 'Days', value: 'DAYS' },
    { label: 'Weeks', value: 'WEEKS' },
    { label: 'Months', value: 'MONTHS' },
    { label: 'Years', value: 'YEARS' }
  ];
  meterUnitOptions: SelectOption[] = [
    { label: 'Hours', value: 'HOURS' },
    { label: 'Cycles', value: 'CYCLES' }
  ];

  private routeSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pmTemplateService: PmTemplateService,
    private assetsService: AssetsService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssetOptions();
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.startEditFlow(id);
      } else {
        this.resetForCreate();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  onCancel(): void {
    this.router.navigate(['/preventive-maintenance']);
  }

  onAutoGeneratePmIdChange(): void {
    if (this.autoGeneratePmId) {
      this.template.pmId = '';
    }
  }

  onCreate(): void {
    if (this.isSubmitting || this.isLoadingDetails) {
      return;
    }

    if (!this.hasLoadedDetails) {
      return;
    }

    this.errorMessage = undefined;
    this.isSubmitting = true;

    const payload = this.buildPayload();
    const operation = this.isEditMode && this.editTemplateId
      ? this.pmTemplateService.updateTemplate(this.editTemplateId, payload)
      : this.pmTemplateService.createTemplate(payload);
    const successMessage = this.isEditMode
      ? 'Preventive maintenance template updated successfully.'
      : 'Preventive maintenance template created successfully.';
    const errorMessage = this.isEditMode
      ? 'Unable to update PM template. Please try again.'
      : 'Unable to create PM template. Please try again.';

    operation.pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.toastr.success(successMessage);
        this.router.navigate(['/preventive-maintenance']);
      },
      error: () => {
        this.errorMessage = errorMessage;
        this.toastr.error(this.errorMessage);
      }
    });
  }

  private buildPayload() {
    const selectedAssetId = this.template.assetDbId;
    const payload: CreatePmTemplatePayload = {
      pmName: this.template.pmName,
      pmType: this.template.pmType,
      appliesToType: this.template.appliesToType,
      assetCategory: this.template.assetCategory,
      planStartDate: this.template.planStartDate,
      planEndDate: this.template.planEndDate || undefined,
      frequencyType: this.template.frequencyType,
      frequencyValue: Number(this.template.frequencyValue || 0),
      timeUnit: this.template.timeUnit,
      meterUnit: this.template.meterUnit,
      graceDays: Number(this.template.graceDays || 0),
      autoGenerateWo: this.template.generateWOAutomatically === 'Yes',
      leadTimeDays: Number(this.template.leadTimeDays || 0),
      linkedWorkType: this.template.linkedWorkType,
      defaultPriority: this.template.defaultPriority
    };

    const pmIdValue = this.template.pmId?.trim();
    if (pmIdValue && (!this.autoGeneratePmId || this.isEditMode)) {
      payload.pmId = pmIdValue;
    }

    if (selectedAssetId !== null && selectedAssetId !== undefined) {
      payload.assetDbId = selectedAssetId;
    }

    return payload;
  }

  private loadAssetOptions(): void {
    this.assetsService.fetchAssets(0, 100).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: response => {
        const content = response.data?.content ?? [];
        this.assetOptions = content
          .filter(asset => asset.id !== undefined)
          .map(asset => ({
            id: asset.id as number,
            label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`
          }));
      },
      error: () => {
        this.assetOptions = [];
      }
    });
  }

  private startEditFlow(id: string): void {
    this.isEditMode = true;
    this.editTemplateId = Number(id);
    this.loadTemplateForEdit(id);
  }

  private resetForCreate(): void {
    this.isEditMode = false;
    this.editTemplateId = undefined;
    this.hasLoadedDetails = true;
    this.isLoadingDetails = false;
    this.errorMessage = undefined;
    this.template = this.createTemplateDefaults();
    this.autoGeneratePmId = false;
    this.cdr.detectChanges();
  }

  private loadTemplateForEdit(id: string): void {
    this.isLoadingDetails = true;
    this.hasLoadedDetails = false;
    this.errorMessage = undefined;

    this.pmTemplateService.fetchTemplateById(id).pipe(
      finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: PmTemplateDetailResponse) => {
        const template = response.data;
        if (!template) {
          this.errorMessage = response.message ?? 'Unable to load template for editing.';
          this.hasLoadedDetails = true;
          this.cdr.detectChanges();
          return;
        }

        this.autoGeneratePmId = false;
        this.template = {
          ...this.createTemplateDefaults(),
          pmId: template.pmId ?? '',
          pmName: template.pmName ?? '',
          pmType: template.pmType ?? '',
          appliesToType: template.appliesToType ?? 'ASSET',
          assetDbId: template.assetDbId ?? null,
          assetCategory: template.assetCategory ?? '',
          planStartDate: template.planStartDate ?? this.dateToday,
          planEndDate: template.planEndDate ?? '',
          frequencyType: template.frequencyType ?? '',
          frequencyValue: String(template.frequencyValue ?? ''),
          timeUnit: template.timeUnit ?? 'HOURS',
          meterUnit: template.meterUnit ?? 'HOURS',
          graceDays: String(template.graceDays ?? ''),
          generateWOAutomatically: template.autoGenerateWo ? 'Yes' : 'No',
          leadTimeDays: String(template.leadTimeDays ?? '7'),
          linkedWorkType: template.linkedWorkType ?? 'PREVENTIVE',
          defaultPriority: template.defaultPriority ?? 'LOW'
        };
        this.hasLoadedDetails = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load template for editing.';
        this.hasLoadedDetails = true;
        this.cdr.detectChanges();
      }
    });
  }

  private createTemplateDefaults(): PmTemplateForm {
    return {
      pmId: '',
      pmName: '',
      pmType: '',
      appliesToType: '',
      assetDbId: null,
      assetCategory: '',
      planStartDate: '',
      planEndDate: '',
      frequencyType: '',
      frequencyValue: '',
      timeUnit: '',
      meterUnit: '',
      graceDays: '',
      generateWOAutomatically: '',
      leadTimeDays: '',
      linkedWorkType: '',
      defaultPriority: ''
    };
  }
}
