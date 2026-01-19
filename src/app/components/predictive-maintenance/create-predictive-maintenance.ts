import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { AssetsService } from '../../services/assets.service';
import { PmTemplateService, PredictiveThresholdPayload } from '../../services/pm-template.service';

interface SelectOption {
  label: string;
  value: string | number | boolean;
}

interface PredictiveForm {
  assetId: number | null;
  meterType: string;
  warningThreshold: string;
  criticalThreshold: string;
  autoCreateWo: boolean;
  defaultPriority: string;
  cooldownHours: string;
}

interface MeterReadingForm {
  assetId: number | null;
  meterType: string;
  readingValue: string;
  readingTime: string;
  notes: string;
}

@Component({
  selector: 'app-create-predictive-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-predictive-maintenance.html',
  styleUrls: ['../preventive-maintenance/create-preventive-maintenance.css']
})
export class CreatePredictiveMaintenanceComponent implements OnInit {
  isSubmitting = false;
  errorMessage?: string;
  isEditMode = false;
  editId?: string;
  meterModalOpen = false;

  assetOptions: Array<{ id: number; label: string }> = [];

  form: PredictiveForm = {
    assetId: null,
    meterType: 'RUN_HOURS',
    warningThreshold: '',
    criticalThreshold: '',
    autoCreateWo: true,
    defaultPriority: 'LOW',
    cooldownHours: ''
  };

  meterReadingForm: MeterReadingForm = {
    assetId: null,
    meterType: 'RUN_HOURS',
    readingValue: '',
    readingTime: '',
    notes: ''
  };

  get selectedAssetLabel(): string {
    const match = this.assetOptions.find(a => a.id === this.meterReadingForm.assetId);
    return match?.label ?? 'Selected Asset';
  }

  meterTypeOptions: SelectOption[] = [
    { label: 'Run Hours', value: 'RUN_HOURS' },
    { label: 'Cycles', value: 'CYCLES' },
    { label: 'Mileage', value: 'MILEAGE' },
    { label: 'Temperature', value: 'TEMPERATURE' }
  ];

  priorityOptions: SelectOption[] = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private assetsService: AssetsService,
    private pmTemplateService: PmTemplateService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editId = id;
      this.loadForEdit(id);
    }
  }

  onCancel(): void {
    this.router.navigate(['/maintenance/predictive']);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.form.assetId) {
      this.errorMessage = 'Please select an asset.';
      return;
    }

    this.errorMessage = undefined;
    this.isSubmitting = true;

    const payload: PredictiveThresholdPayload = {
      assetId: this.form.assetId,
      meterType: this.form.meterType,
      warningThreshold: this.toNumber(this.form.warningThreshold),
      criticalThreshold: this.toNumber(this.form.criticalThreshold),
      autoCreateWo: this.form.autoCreateWo,
      defaultPriority: this.form.defaultPriority,
      cooldownHours: this.toNumber(this.form.cooldownHours)
    };

    const request$ = this.isEditMode && this.editId
      ? this.pmTemplateService.updatePredictiveThreshold(this.editId, payload)
      : this.pmTemplateService.createPredictiveThreshold(payload);

    request$
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditMode ? 'Predictive maintenance threshold updated.' : 'Predictive maintenance threshold saved.');
          if (this.isEditMode) {
            this.router.navigate(['/maintenance/predictive']);
          } else {
            this.prepareMeterModal();
            this.meterModalOpen = true;
            setTimeout(() => this.cdr.detectChanges(), 0);
            this.cdr.detectChanges();
          }
        },
        error: err => {
          const apiMessage = err?.error?.message || err?.message;
          this.errorMessage = apiMessage || (this.isEditMode
            ? 'Unable to update predictive maintenance threshold. Please try again.'
            : 'Unable to save predictive maintenance threshold. Please try again.');
          // Do not fire an extra toast here; API/global interceptor already surfaces the server error.
        }
      });
  }

  private loadForEdit(id: string): void {
    this.pmTemplateService.fetchPredictiveThresholdById(id).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: response => {
        this.form = {
          assetId: response.assetId ?? null,
          meterType: response.meterType ?? 'RUN_HOURS',
          warningThreshold: String(response.warningThreshold ?? ''),
          criticalThreshold: String(response.criticalThreshold ?? ''),
          autoCreateWo: Boolean(response.autoCreateWo),
          defaultPriority: response.defaultPriority ?? 'LOW',
          cooldownHours: String(response.cooldownHours ?? '')
        };
      },
      error: () => {
        this.errorMessage = 'Unable to load predictive threshold for editing.';
      }
    });
  }

  closeMeterModal(): void {
    this.meterModalOpen = false;
    this.cdr.detectChanges();
  }

  submitMeterReading(): void {
    if (!this.meterReadingForm.assetId) {
      this.toastr.error('Asset is required.');
      return;
    }
    if (!this.meterReadingForm.readingValue) {
      this.toastr.error('Reading value is required.');
      return;
    }
    if (!this.meterReadingForm.readingTime) {
      this.toastr.error('Reading time is required.');
      return;
    }
    const payload = {
      assetId: this.meterReadingForm.assetId,
      meterType: this.meterReadingForm.meterType,
      readingValue: this.toNumber(this.meterReadingForm.readingValue),
      readingTime: this.meterReadingForm.readingTime,
      notes: this.meterReadingForm.notes || undefined
    };

    this.pmTemplateService.createPredictiveMeterReading(payload).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: () => {
        this.toastr.success('Meter reading captured.');
        this.closeMeterModal();
        this.router.navigate(['/maintenance/predictive']);
      },
      error: () => {
        this.toastr.error('Unable to save meter reading. Please try again.');
      }
    });
  }

  private prepareMeterModal(): void {
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    this.meterReadingForm = {
      assetId: this.form.assetId,
      meterType: this.form.meterType,
      readingValue: '',
      readingTime: iso,
      notes: ''
    };
  }

  private loadAssets(): void {
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

  private toNumber(value: string): number {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
