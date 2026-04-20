import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { IotMetric, IotMetricService } from '../../services/iot-metric.service';

@Component({
  selector: 'app-iot-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './iot-metrics.html',
  styleUrls: ['./iot-metrics.css']
})
export class IotMetricsComponent implements OnInit {
  metrics: IotMetric[] = [];
  filteredMetrics: IotMetric[] = [];
  searchText = '';
  totalMetrics = 0;
  currentPage = 0;
  itemsPerPage = 10;

  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;
  loadingRows = Array.from({ length: 5 });

  constructor(
    private readonly router: Router,
    private readonly iotMetricService: IotMetricService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.iotMetricService
      .fetchMetrics({ page: this.currentPage, size: this.itemsPerPage })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.metrics = response.data?.content ?? [];
          this.applyFilter();
          this.totalMetrics = response.data?.totalElements ?? this.metrics.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          if (typeof response.data?.page === 'number') {
            this.currentPage = response.data.page;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.metrics = [];
          this.filteredMetrics = [];
          this.totalMetrics = 0;
          this.errorMessage = 'Unable to load IoT metrics.';
          this.toastr.error('Unable to load IoT metrics. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  refresh(): void {
    this.currentPage = 0;
    this.loadMetrics();
  }

  createMetric(): void {
    this.router.navigate(['/iot/metrics/create']);
  }

  viewMetric(metric: IotMetric): void {
    if (!metric.id) {
      return;
    }

    this.router.navigate(['/iot/metrics/view', metric.id]);
  }

  editMetric(metric: IotMetric): void {
    if (!metric.id) {
      return;
    }

    this.router.navigate(['/iot/metrics/edit', metric.id]);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadMetrics();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadMetrics();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalMetrics / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalMetrics) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalMetrics) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalMetrics);
  }

  applyFilter(): void {
    const query = this.searchText.trim().toLowerCase();
    if (!query) {
      this.filteredMetrics = [...this.metrics];
      return;
    }

    this.filteredMetrics = this.metrics.filter((metric) => {
      const id = metric.id !== undefined && metric.id !== null ? String(metric.id) : '';
      const code = metric.metricCode ?? '';
      const name = metric.metricName ?? '';
      const unit = metric.unit ?? '';
      return (
        id.toLowerCase().includes(query) ||
        code.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query) ||
        unit.toLowerCase().includes(query)
      );
    });
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

  trackByMetric(_: number, metric: IotMetric): number | string {
    return metric.id ?? `${metric.metricCode}-${metric.updatedAt ?? ''}`;
  }
}
