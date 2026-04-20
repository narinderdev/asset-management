import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import {
  IotMetricCreatePayload,
  IotMetricService,
  IotMetricUpdatePayload
} from '../../services/iot-metric.service';

@Component({
  selector: 'app-create-iot-metric',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-iot-metric.html',
  styleUrls: ['./create-iot-metric.css']
})
export class CreateIotMetricComponent implements OnInit {
  isEditMode = false;
  metricId?: string;
  isLoading = false;
  isSubmitting = false;
  errorMessage?: string;

  metric = {
    metricCode: '',
    metricName: '',
    unit: '',
    description: '',
    active: true
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly iotMetricService: IotMetricService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEditMode = true;
    this.metricId = id;
    this.loadMetric(id);
  }

  onCancel(): void {
    this.router.navigate(['/iot/metrics']);
  }

  onSubmit(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;

    const request$ = this.isEditMode && this.metricId
      ? this.iotMetricService.updateMetric(this.metricId, payload as IotMetricUpdatePayload)
      : this.iotMetricService.createMetric(payload as IotMetricCreatePayload);

    request$
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditMode ? 'IoT metric updated successfully.' : 'IoT metric created successfully.');
          this.router.navigate(['/iot/metrics']);
        },
        error: () => {
          this.errorMessage = this.isEditMode
            ? 'Unable to update IoT metric. Please try again.'
            : 'Unable to create IoT metric. Please try again.';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  private loadMetric(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.iotMetricService
      .fetchMetricById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          const metric = response.data;
          if (!metric) {
            this.errorMessage = response.message ?? 'IoT metric not found.';
            return;
          }

          this.metric = {
            metricCode: metric.metricCode ?? '',
            metricName: metric.metricName ?? '',
            unit: metric.unit ?? '',
            description: metric.description ?? '',
            active: Boolean(metric.active)
          };
        },
        error: () => {
          this.errorMessage = 'Unable to load IoT metric details.';
        }
      });
  }

  private buildPayload(): IotMetricCreatePayload | IotMetricUpdatePayload | null {
    const metricCode = this.metric.metricCode.trim();
    const metricName = this.metric.metricName.trim();

    if (!metricCode) {
      this.errorMessage = 'Metric code is required.';
      return null;
    }

    if (!metricName) {
      this.errorMessage = 'Metric name is required.';
      return null;
    }

    return {
      metricCode,
      metricName,
      unit: this.metric.unit.trim() || undefined,
      description: this.metric.description.trim() || undefined,
      active: this.metric.active
    };
  }
}
