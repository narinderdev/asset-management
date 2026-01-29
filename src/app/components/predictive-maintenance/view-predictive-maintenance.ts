import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PmTemplateService } from '../../services/pm-template.service';
import { FormsModule } from '@angular/forms';
import { Loader } from '../loader/loader';

type PredictiveThreshold = {
  id?: number;
  assetId?: number;
  assetName?: string;
  meterType?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  autoCreateWo?: boolean;
  defaultPriority?: string;
  cooldownHours?: number;
  lastTriggeredSeverity?: string;
  meterReadings?: Array<{
    id?: number;
    meterType?: string;
    readingValue?: number;
    readingTime?: string;
    severity?: string;
    notes?: string;
  }>;
};

@Component({
  selector: 'app-view-predictive-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './view-predictive-maintenance.html',
  styleUrls: ['./view-predictive-maintenance.css']
})
export class ViewPredictiveMaintenanceComponent implements OnInit {
  threshold?: PredictiveThreshold;
  isLoading = false;
  errorMessage?: string;
  meterModalOpen = false;
  meterReadingForm = {
    assetId: null as number | null,
    meterType: '',
    readingValue: '',
    readingTime: '',
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pmTemplateService: PmTemplateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No predictive maintenance id provided.';
      return;
    }
    this.loadThreshold(id);
  }

  goBack(): void {
    this.router.navigate(['/maintenance/predictive']);
  }

    private loadThreshold(id: string): void {
      this.threshold = undefined;
      this.isLoading = true;
      this.errorMessage = undefined;

    this.pmTemplateService
      .fetchPredictiveThresholdById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: data => {
          if (data) {
            this.threshold = data;
            this.errorMessage = undefined; // clear any stale error from a previous load
          } else {
            this.errorMessage = 'Predictive maintenance details not found.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.threshold = undefined; // avoid showing stale data when the fetch fails
          this.errorMessage = 'Unable to load predictive maintenance details.';
          this.cdr.detectChanges();
        }
      });
  }

  openMeterModal(): void {
    if (!this.threshold) {
      return;
    }
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    this.meterReadingForm = {
      assetId: this.threshold.assetId ?? null,
      meterType: this.threshold.meterType ?? '',
      readingValue: '',
      readingTime: iso,
      notes: ''
    };
    this.meterModalOpen = true;
    this.cdr.detectChanges();
  }

  closeMeterModal(): void {
    this.meterModalOpen = false;
    this.cdr.detectChanges();
  }

  submitMeterReading(): void {
    if (!this.meterReadingForm.assetId) {
      return;
    }
    if (!this.meterReadingForm.readingValue) {
      return;
    }
    if (!this.meterReadingForm.readingTime) {
      return;
    }
    const payload = {
      assetId: this.meterReadingForm.assetId,
      meterType: this.meterReadingForm.meterType,
      readingValue: Number(this.meterReadingForm.readingValue),
      readingTime: this.meterReadingForm.readingTime,
      notes: this.meterReadingForm.notes || undefined
    };
    this.pmTemplateService.createPredictiveMeterReading(payload).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: () => {
        this.closeMeterModal();
        this.loadThreshold(String(this.threshold?.id));
      },
      error: () => {
        // keep modal open; could add inline error display if desired
      }
    });
  }

  prettify(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
