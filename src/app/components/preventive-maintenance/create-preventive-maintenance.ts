import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import {
  PmTemplateService,
  CreatePreventiveMaintenancePayload,
  PreventiveMaintenanceDetailResponse,
  PreventiveMaintenanceDetail,
  UpdatePreventiveMaintenancePayload
} from '../../services/pm-template.service';
import { AssetsService } from '../../services/assets.service';
import { finalize } from 'rxjs/operators';
import { Subscription, Observable } from 'rxjs';

interface SelectOption {
  label: string;
  value: string | number | boolean;
}

interface PreventiveMaintenanceForm {
  pmId?: string;
  pmName?: string;
  applyTo?: 'ASSET' | 'ASSET_TYPE';
  assetId: number | null;
  assetTypeId: number | null;
  location: string;
  title: string;
  priority: string;
  scheduleType: string;
  leadTimeDays: string;
  startDate: string;
  intervalUnit: string;
  intervalValue: string;
  meterType: string;
  meterIntervalValue: string;
  currentMeterReading: string;
  workType: string;
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

  template: PreventiveMaintenanceForm = this.createTemplateDefaults();

  isSubmitting = false;
  errorMessage?: string;
  isLoadingDetails = false;
  hasLoadedDetails = false;
  isEditMode = false;
  editTemplateId?: number;

  assetOptions: Array<{ id: number; label: string; location?: string }> = [];
  assetTypeOptions: Array<{ id: number; label: string }> = [];
  locationLocked = false;

  scheduleTypeOptions: SelectOption[] = [
    { label: 'Time Based', value: 'TIME_BASED' },
    { label: 'Usage Based', value: 'USAGE_BASED' }
  ];
  priorityOptions: SelectOption[] = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];
  intervalUnitOptions: SelectOption[] = [
    { label: 'Days', value: 'DAYS' },
    { label: 'Weeks', value: 'WEEKS' },
    { label: 'Months', value: 'MONTHS' },
    { label: 'Years', value: 'YEARS' }
  ];
  meterTypeOptions: SelectOption[] = [
    { label: 'Run Hours', value: 'RUN_HOURS' },
    { label: 'Cycles', value: 'CYCLES' },
    { label: 'Mileage', value: 'MILEAGE' },
    { label: 'Temperature', value: 'TEMPERATURE' }
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
    this.loadAssetTypeOptions();
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
    this.router.navigate(['/maintenance/preventive']);
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

    const payload = this.buildMaintenancePayload();
    const successMessage = this.isEditMode ? 'Preventive maintenance template saved.' : 'Preventive maintenance template created successfully.';
    const errorMessage = this.isEditMode ? 'Unable to save PM template. Please try again.' : 'Unable to create PM template. Please try again.';
    const request$: Observable<any> = this.isEditMode && this.editTemplateId
      ? this.pmTemplateService.updatePreventiveMaintenance(this.editTemplateId, this.buildUpdatePayload(payload))
      : this.pmTemplateService.createPreventiveMaintenance(payload);

    request$.pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.toastr.success(successMessage);
        this.router.navigate(['/maintenance/preventive']);
      },
      error: () => {
        this.errorMessage = errorMessage;
        this.toastr.error(this.errorMessage);
      }
    });
  }

  private buildMaintenancePayload() {
    const isTimeBased = this.isTimeBased();
    const isUsageBased = this.isUsageBased();
    const applyToAssetType = this.isApplyToAssetType();

    const intervalValue = isTimeBased
      ? this.toNumberOrUndefined(this.template.intervalValue)
      : undefined;

    const meterIntervalValue = isUsageBased
      ? this.toNumberOrUndefined(this.template.meterIntervalValue)
      : undefined;

    const payload: CreatePreventiveMaintenancePayload = {
      assetId: applyToAssetType ? undefined : this.template.assetId ?? undefined,
      assetTypeId: applyToAssetType ? this.template.assetTypeId ?? undefined : undefined,
      applyTo: this.template.applyTo ?? undefined,
      location: this.template.location || undefined,
      title: this.template.title,
      workType: this.template.workType || 'PREVENTIVE',
      priority: this.template.priority || 'LOW',
      scheduleType: this.template.scheduleType || 'TIME_BASED',
      leadTimeDays: this.toNumberOrUndefined(this.template.leadTimeDays),
      startDate: this.template.startDate || undefined,
      intervalUnit: isTimeBased ? this.template.intervalUnit || undefined : undefined,
      intervalValue,
      meterType: isUsageBased ? this.template.meterType || undefined : undefined,
      meterIntervalValue,
      currentMeterReading: isUsageBased ? this.toNumberOrUndefined(this.template.currentMeterReading) : undefined
    };

    return payload;
  }

  private buildUpdatePayload(base: CreatePreventiveMaintenancePayload): UpdatePreventiveMaintenancePayload {
    return {
      ...base,
      active: true
    };
  }

  private toNumberOrUndefined(value?: string | number | null) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
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
            label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`,
            location: (asset as any)?.location
              ?? (asset as any)?.assetLocation
              ?? (asset as any)?.site
              ?? (asset as any)?.locationName
          }));
        this.syncLocationFromAsset();
      },
      error: () => {
        this.assetOptions = [];
        this.locationLocked = false;
      }
    });
  }

  private loadAssetTypeOptions(): void {
    this.assetsService.fetchAssetTypes().pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: response => {
        const types = response.data ?? [];
        this.assetTypeOptions = types
          .filter(type => type.id !== undefined)
          .map(type => ({
            id: type.id as number,
            label: type.name ?? type.code ?? `Asset Type ${type.id}`
          }));
      },
      error: () => {
        this.assetTypeOptions = [];
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
    this.cdr.detectChanges();
  }

  private loadTemplateForEdit(id: string): void {
    this.isLoadingDetails = true;
    this.hasLoadedDetails = false;
    this.errorMessage = undefined;

    this.pmTemplateService.fetchPreventiveMaintenanceById(id).pipe(
      finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: PreventiveMaintenanceDetailResponse | PreventiveMaintenanceDetail) => {
        const data: PreventiveMaintenanceDetail | undefined = (response as PreventiveMaintenanceDetailResponse)?.data
          ?? (response as PreventiveMaintenanceDetail);
        if (!data) {
          this.errorMessage = (response as PreventiveMaintenanceDetailResponse)?.message ?? 'Unable to load template for editing.';
          this.hasLoadedDetails = true;
          this.cdr.detectChanges();
          return;
        }

        const normalizedStartDate = data.startDate
          ? data.startDate.split('T')[0]
          : this.dateToday;

        this.template = {
          ...this.createTemplateDefaults(),
          assetId: data.assetId ?? null,
          location: data.location ?? '',
          title: data.title ?? '',
          priority: data.priority ?? 'LOW',
          scheduleType: data.scheduleType ?? 'TIME_BASED',
          leadTimeDays: String(data.leadTimeDays ?? ''),
          startDate: normalizedStartDate,
          intervalUnit: data.intervalUnit ?? 'DAYS',
          intervalValue: String(data.intervalValue ?? ''),
          meterType: data.meterType ?? 'RUN_HOURS',
          meterIntervalValue: String(data.meterIntervalValue ?? ''),
          currentMeterReading: String(data.currentMeterReading ?? '')
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

  private createTemplateDefaults(): PreventiveMaintenanceForm {
    return {
      pmId: '',
      pmName: '',
      applyTo: 'ASSET',
      assetId: null,
      assetTypeId: null,
      location: '',
      title: '',
      priority: 'LOW',
      scheduleType: 'TIME_BASED',
      leadTimeDays: '',
      startDate: this.dateToday,
      intervalUnit: 'DAYS',
      intervalValue: '',
      meterType: 'RUN_HOURS',
      meterIntervalValue: '',
      currentMeterReading: '',
      workType: 'PREVENTIVE'
    };
  }

  isTimeBased(): boolean {
    return (this.template.scheduleType || '').toUpperCase() === 'TIME_BASED';
  }

  isUsageBased(): boolean {
    return (this.template.scheduleType || '').toUpperCase() === 'USAGE_BASED';
  }

  isApplyToAsset(): boolean {
    return (this.template.applyTo || 'ASSET').toUpperCase() === 'ASSET';
  }

  isApplyToAssetType(): boolean {
    return (this.template.applyTo || '').toUpperCase() === 'ASSET_TYPE';
  }

  onApplyTargetChange(): void {
    if (this.isApplyToAssetType()) {
      this.template.assetId = null;
      this.locationLocked = false;
    } else {
      this.template.assetTypeId = null;
      this.syncLocationFromAsset();
    }
    this.cdr.detectChanges();
  }

  onAssetChange(): void {
    this.syncLocationFromAsset();
  }

  private syncLocationFromAsset(): void {
    if (!this.isApplyToAsset() || !this.template.assetId) {
      this.locationLocked = false;
      return;
    }
    const selected = this.assetOptions.find(a => a.id === this.template.assetId);
    if (selected?.location) {
      const loc = selected.location as any;
      this.template.location =
        typeof loc === 'string'
          ? loc
          : loc?.location ??
            loc?.locationName ??
            loc?.primaryLocation ??
            loc?.functionalLocation ??
            '';
      this.locationLocked = true;
    } else {
      this.locationLocked = false;
    }
    this.cdr.detectChanges();
  }
}

