import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AssetsService } from '../services/assets.service';
import { BudgetWorkOrder, DashboardService } from '../services/dashboard.service';

interface BudgetRowView {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  status: string;
  assetId: string;
  assetName: string;
  estimatedBudget: number;
  actualBudget: number;
  varianceAmount: number;
  variancePercentage: number;
}

interface FilterOption {
  label: string;
  value: string;
}

type LooseBudgetDashboardData = Record<string, unknown> & {
  workOrders?: unknown;
};

type LooseBudgetWorkOrder = Record<string, unknown>;

@Component({
  selector: 'app-budget-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget-dashboard.html',
  styleUrl: './budget-dashboard.css'
})
export class BudgetDashboardComponent implements OnInit, AfterViewInit {
  period = 'THIS_MONTH';
  assetId = '';
  workOrderId = '';

  isLoading = false;
  errorMessage = '';
  apiMessage = '';

  startDate = '-';
  endDate = '-';
  totalEstimatedBudget = 0;
  totalActualBudget = 0;
  totalVarianceAmount = 0;
  totalVariancePercentage = 0;

  workOrders: BudgetRowView[] = [];
  assetOptions: FilterOption[] = [{ label: 'All Assets', value: '' }];
  workOrderOptions: FilterOption[] = [{ label: 'All Work Orders', value: '' }];
  private hasLoadedInitialData = false;

  readonly periodOptions = [
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'This Week', value: 'THIS_WEEK' },
    { label: 'This Year', value: 'THIS_YEAR' }
  ];

  constructor(
    private dashboardService: DashboardService,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || this.hasLoadedInitialData) {
      return;
    }
    this.hasLoadedInitialData = true;
    this.loadFilterOptions();
    this.applyFilters();
  }

  onPeriodChange(value: string): void {
    if (value === this.period) {
      return;
    }
    this.period = value;
    this.assetId = '';
    this.workOrderId = '';
    this.loadFilterOptions();
    this.applyFilters();
  }

  onAssetChange(value: string): void {
    if (value === this.assetId) {
      return;
    }
    this.assetId = value;
    this.workOrderId = '';
    this.applyFilters();
  }

  onWorkOrderChange(value: string): void {
    if (value === this.workOrderId) {
      return;
    }
    this.workOrderId = value;
    this.applyFilters();
  }

  applyFilters(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.apiMessage = '';

    this.dashboardService
      .fetchWorkOrderBudget({
        assetId: this.assetId,
        workOrderId: this.workOrderId,
        period: this.period
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const data = response.data as LooseBudgetDashboardData | undefined;

          if (!data) {
            this.resetView();
            this.errorMessage = response.message || 'No budget dashboard data available.';
            return;
          }

          this.apiMessage = response.message || '';
          this.startDate = this.pickText(data, ['startDate', 'start_date']) || '-';
          this.endDate = this.pickText(data, ['endDate', 'end_date']) || '-';
          this.totalEstimatedBudget = this.pickNumber(data, ['totalEstimatedBudget', 'totalEstimatedbudget']);
          this.totalActualBudget = this.pickNumber(data, ['totalActualBudget', 'totalActualbudget']);
          this.totalVarianceAmount = this.pickNumber(data, ['totalVarianceAmount', 'totalVarianceamount']);
          this.totalVariancePercentage = this.pickNumber(data, [
            'totalVariancePercentage',
            'totalVariancepercentage'
          ]);
          const workOrders = Array.isArray(data.workOrders) ? data.workOrders : [];
          this.workOrders = workOrders.map((wo) => this.mapWorkOrder(wo as LooseBudgetWorkOrder));
          this.cdr.detectChanges();
        },
        error: () => {
          this.resetView();
          this.errorMessage = 'Unable to load budget dashboard data.';
          this.cdr.detectChanges();
        }
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  varianceClass(value: number): string {
    if (value > 0) {
      return 'variance-up';
    }
    if (value < 0) {
      return 'variance-down';
    }
    return 'variance-neutral';
  }

  private mapWorkOrder(wo: BudgetWorkOrder | LooseBudgetWorkOrder): BudgetRowView {
    const assetId = this.pickText(wo, ['assetId', 'asset_id']) || '';
    const workOrderId = this.pickText(wo, ['workOrderId', 'work_order_id']) || '';
    const id = String(this.pickText(wo, ['id']) || '');
    return {
      id,
      workOrderId,
      workOrderNumber: this.pickText(wo, ['workOrderNumber', 'work_order_number', 'workOrderId']) || '-',
      title: this.pickText(wo, ['title']) || '-',
      status: (this.pickText(wo, ['status']) || '-').toUpperCase().replace(/_/g, ' '),
      assetId,
      assetName: this.pickText(wo, ['assetName', 'asset_name', 'assetId']) || '-',
      estimatedBudget: this.pickNumber(wo, ['estimatedBudget', 'estimatedbudget']),
      actualBudget: this.pickNumber(wo, ['actualBudget', 'actualbudget']),
      varianceAmount: this.pickNumber(wo, ['varianceAmount', 'varianceamount']),
      variancePercentage: this.pickNumber(wo, ['variancePercentage', 'variancepercentage'])
    };
  }

  private loadFilterOptions(): void {
    forkJoin({
      assets: this.assetsService.fetchAssetReports({ page: 0, size: 1000 }),
      workOrders: this.assetsService.fetchWorkOrderReports({ page: 0, size: 1000 })
    }).subscribe({
      next: ({ assets, workOrders }) => {
        const assetMap = new Map<string, string>();
        const workOrderMap = new Map<string, string>();

        const assetItems = this.pickArray(assets, [
          'data.content',
          'data.assets',
          'data.items',
          'data',
          'content'
        ]);
        assetItems.forEach((asset: any) => {
          const assetId = this.pickText(asset, ['id', 'assetDbId', 'asset_db_id']) || '';
          const assetName = this.pickText(asset, ['assetName', 'asset_name', 'name']) || '';
          const assetCode = this.pickText(asset, ['assetId', 'asset_id']) || '';
          if (assetId) {
            assetMap.set(assetId, assetName || assetCode || assetId);
          }
        });

        const workOrderItems = this.pickArray(workOrders, [
          'data.workOrders',
          'data.workorders',
          'data.items',
          'data.content',
          'data',
          'workOrders'
        ]);
        workOrderItems.forEach((wo: any) => {
          const id =
            this.pickText(wo, ['id', 'workOrderId', 'work_order_id', 'workOrderNumber']) || '';
          const title = this.pickText(wo, ['title', 'woTitle', 'name']) || '';
          const fallback =
            this.pickText(wo, ['workOrderNumber', 'workOrderId', 'work_order_number']) || '';
          if (id) {
            workOrderMap.set(id, title || fallback || id);
          }
        });

        this.assetOptions = [
          { label: 'All Assets', value: '' },
          ...Array.from(assetMap.entries()).map(([value, label]) => ({ value, label }))
        ];
        this.workOrderOptions = [
          { label: 'All Work Orders', value: '' },
          ...Array.from(workOrderMap.entries()).map(([value, label]) => ({ value, label }))
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.assetOptions = [{ label: 'All Assets', value: '' }];
        this.workOrderOptions = [{ label: 'All Work Orders', value: '' }];
        this.cdr.detectChanges();
      }
    });
  }

  private resetView(): void {
    this.startDate = '-';
    this.endDate = '-';
    this.totalEstimatedBudget = 0;
    this.totalActualBudget = 0;
    this.totalVarianceAmount = 0;
    this.totalVariancePercentage = 0;
    this.workOrders = [];
  }

  private pickNumber(source: object, keys: string[]): number {
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
    return 0;
  }

  private pickText(source: object, keys: string[]): string | undefined {
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined) {
        continue;
      }
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
    return undefined;
  }

  private pickArray(source: unknown, paths: string[]): any[] {
    if (!source || typeof source !== 'object') {
      return [];
    }

    for (const path of paths) {
      const value = this.getValueByPath(source as Record<string, unknown>, path);
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private getValueByPath(source: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = source;
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
