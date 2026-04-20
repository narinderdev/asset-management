import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Loader } from '../loader/loader';
import { IotMetric, IotMetricService } from '../../services/iot-metric.service';

@Component({
  selector: 'app-view-iot-metric',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-iot-metric.html',
  styleUrls: ['./view-iot-metric.css']
})
export class ViewIotMetricComponent implements OnInit {
  metric?: IotMetric;
  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly iotMetricService: IotMetricService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing IoT metric identifier.';
      this.hasLoaded = true;
      return;
    }
    this.loadMetric(id);
  }

  goBack(): void {
    this.router.navigate(['/iot/metrics']);
  }

  editMetric(): void {
    if (!this.metric?.id) {
      return;
    }
    this.router.navigate(['/iot/metrics/edit', this.metric.id]);
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

  private loadMetric(id: string): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.iotMetricService
      .fetchMetricById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.hasLoaded = true;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.metric = response.data;
          if (!this.metric) {
            this.errorMessage = response.message ?? 'IoT metric not found.';
          }
        },
        error: () => {
          this.metric = undefined;
          this.errorMessage = 'Unable to load IoT metric details.';
        }
      });
  }
}
