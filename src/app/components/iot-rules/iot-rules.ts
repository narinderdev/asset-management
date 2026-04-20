import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { IotRule, IotRuleService } from '../../services/iot-rule.service';

@Component({
  selector: 'app-iot-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './iot-rules.html',
  styleUrl: './iot-rules.css'
})
export class IotRulesComponent implements OnInit {
  rules: IotRule[] = [];
  filteredRules: IotRule[] = [];
  searchText = '';
  totalRules = 0;
  currentPage = 0;
  itemsPerPage = 10;

  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;
  loadingRows = Array.from({ length: 5 });

  constructor(
    private readonly iotRuleService: IotRuleService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.iotRuleService
      .fetchRules({ page: this.currentPage, size: this.itemsPerPage })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.rules = response.data?.content ?? [];
          this.applyFilter();
          this.totalRules = response.data?.totalElements ?? this.rules.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          if (typeof response.data?.page === 'number') {
            this.currentPage = response.data.page;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.rules = [];
          this.filteredRules = [];
          this.totalRules = 0;
          this.errorMessage = 'Unable to load IoT rules.';
          this.toastr.error('Unable to load IoT rules. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  refresh(): void {
    this.currentPage = 0;
    this.loadRules();
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadRules();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadRules();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRules / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalRules) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalRules) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalRules);
  }

  createRule(): void {
    this.router.navigate(['/iot/rules/create']);
  }

  viewRule(rule: IotRule): void {
    if (!rule.id) {
      return;
    }
    this.router.navigate(['/iot/rules/view', rule.id]);
  }

  editRule(rule: IotRule): void {
    if (!rule.id) {
      return;
    }
    this.router.navigate(['/iot/rules/edit', rule.id]);
  }

  deleteRule(rule: IotRule): void {
    if (!rule.id || this.isLoading) {
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Delete IoT rule #${rule.id}?`)
      : false;
    if (!confirmed) {
      return;
    }

    this.isLoading = true;
    this.iotRuleService
      .deleteRule(rule.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('IoT rule deleted successfully.');
          this.loadRules();
        },
        error: () => {
          this.toastr.error('Unable to delete IoT rule.');
          this.cdr.detectChanges();
        }
      });
  }

  applyFilter(): void {
    const query = this.searchText.trim().toLowerCase();
    if (!query) {
      this.filteredRules = [...this.rules];
      return;
    }
    this.filteredRules = this.rules.filter((rule) => {
      const id = rule.id !== undefined && rule.id !== null ? String(rule.id) : '';
      const asset = rule.assetName ?? '';
      const metric = rule.metricName ?? rule.metricCode ?? '';
      const operator = rule.ruleOperator ?? '';
      return (
        id.toLowerCase().includes(query) ||
        asset.toLowerCase().includes(query) ||
        metric.toLowerCase().includes(query) ||
        operator.toLowerCase().includes(query)
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

  trackByRule(_: number, rule: IotRule): number | string {
    return rule.id ?? `${rule.assetId}-${rule.metricCode}-${rule.updatedAt ?? ''}`;
  }
}
