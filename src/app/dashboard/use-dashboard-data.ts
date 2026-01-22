import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  DashboardApiResponse,
  DashboardData,
  DashboardService,
  MaintenanceCostDataPoint,
  RecentWorkOrder,
  SummaryMetric,
  WorkOrdersByStatus,
} from '../services/dashboard.service';

export type MetricDirection = 'up' | 'down' | null;

export interface MetricDisplay {
  label: string;
  count: number;
  changePercentage: number | null;
  changeDirection: MetricDirection;
  comparisonPeriod?: string | null;
}

export interface WorkOrderStatusDisplay {
  key: 'new' | 'in_progress' | 'completed';
  label: string;
  value: number;
  color: string;
}

export interface CostSummaryDisplay {
  items: Array<{
    month: string;
    cost: number;
    currency?: string;
    unit?: string;
  }>;
  axisLabel: string;
}

export interface DashboardRecentWorkOrder {
  woId: string;
  title: string;
  asset: string;
  technician: string;
  dueDate: string | null;
  formattedDueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

export interface DashboardViewData {
  metrics: {
    openServiceRequests: MetricDisplay;
    activeWorkOrders: MetricDisplay;
    overdueTasks: MetricDisplay;
    criticalAssetsDown: MetricDisplay;
  };
  workOrdersByStatus: {
    total: number;
    statuses: WorkOrderStatusDisplay[];
  };
  costSummary: CostSummaryDisplay;
  recentWorkOrders: DashboardRecentWorkOrder[];
  metadata: {
    generatedAt?: string | null;
    dataFreshness?: string | null;
  };
}

export interface UseDashboardDataResult {
  data: Signal<DashboardViewData | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  refetch: () => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const dashboardService = inject(DashboardService);
  const destroyRef = inject(DestroyRef);

  const data = signal<DashboardViewData | null>(null);
  const loading = signal<boolean>(false);
  const error = signal<string | null>(null);

  const subscriptions = new Subscription();

  const fetchDashboard = (): void => {
    loading.set(true);
    error.set(null);

    const sub = dashboardService.fetchDashboard().subscribe({
      next: (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          error.set(response.message ?? 'Unable to load dashboard data.');
          loading.set(false);
          return;
        }

        data.set(normalizeDashboardResponse(response));
        loading.set(false);
      },
      error: () => {
        error.set('Unable to load dashboard data. Please try again.');
        loading.set(false);
      },
    });

    subscriptions.add(sub);
  };

  destroyRef.onDestroy(() => {
    subscriptions.unsubscribe();
  });

  fetchDashboard();

  return {
    data,
    loading,
    error,
    refetch: () => fetchDashboard(),
  };
}

function normalizeDashboardResponse(response: DashboardApiResponse): DashboardViewData {
  const dashboard = response.data ?? ({} as DashboardData);

  const recentWorkOrders = (dashboard.recent_work_orders ?? []).map((order) =>
    normalizeRecentWorkOrder(order),
  );
  const overdueCount = calculateOverdueCount(recentWorkOrders);

  const metrics = {
    openServiceRequests: normalizeMetric(
      dashboard.summary_metrics?.open_service_requests,
      'Open Service Requests',
    ),
    activeWorkOrders: normalizeMetric(
      dashboard.summary_metrics?.active_work_orders,
      'Active Work Orders',
    ),
    overdueTasks: {
      label: 'Overdue Tasks',
      count: overdueCount,
      changeDirection: null,
      changePercentage: null,
    },
    criticalAssetsDown: normalizeMetric(
      dashboard.summary_metrics?.critical_assets_down,
      'Critical Assets Down',
    ),
  };

  const statusData = normalizeStatuses(dashboard.work_orders_by_status);
  const costSummary = normalizeCostSummary(dashboard.maintenance_cost_summary?.data ?? []);

  return {
    metrics,
    workOrdersByStatus: statusData,
    costSummary,
    recentWorkOrders,
    metadata: {
      generatedAt: dashboard.metadata?.generated_at ?? null,
      dataFreshness: dashboard.metadata?.data_freshness ?? null,
    },
  };
}

function normalizeStatuses(status: WorkOrdersByStatus | undefined) {
  const newCount = toNumber(status?.new);
  const inProgress = toNumber(status?.in_progress);
  const completed = toNumber(status?.completed);
  const total = status?.total ?? newCount + inProgress + completed;

  const fallbackTotal = total > 0 ? total : newCount + inProgress + completed || 1;

  const statuses: WorkOrderStatusDisplay[] = [
    { key: 'new', label: 'New', value: newCount, color: '#ef4444' },
    { key: 'in_progress', label: 'In Progress', value: inProgress, color: '#f59e0b' },
    { key: 'completed', label: 'Completed', value: completed, color: '#10b981' },
  ];

  return {
    total: fallbackTotal,
    statuses,
  };
}

function normalizeCostSummary(dataPoints: MaintenanceCostDataPoint[]): CostSummaryDisplay {
  const items = dataPoints.map((item) => ({
    month: item.month ?? '',
    cost: toNumber(item.cost),
    currency: item.currency ?? 'USD',
    unit: item.unit ?? undefined,
  }));

  const sample = items.find((point) => point.currency || point.unit);
  const currency = sample?.currency ?? 'USD';
  const unit = (sample?.unit || '').toLowerCase();
  const axisLabel = unit === 'thousands' ? `${currency} (thousands)` : currency;

  return {
    items,
    axisLabel,
  };
}

function normalizeMetric(metric: SummaryMetric | undefined, label: string): MetricDisplay {
  const changeDirection = toDirection(metric?.change_direction);
  const changePercentage =
    metric?.change_percentage === null || metric?.change_percentage === undefined
      ? null
      : metric.change_percentage;

  return {
    label,
    count: toNumber(metric?.count),
    changeDirection,
    changePercentage,
    comparisonPeriod: metric?.comparison_period ?? null,
  };
}

function normalizeRecentWorkOrder(order: RecentWorkOrder): DashboardRecentWorkOrder {
  const dueDate = order.due_date ?? null;
  return {
    woId: order.wo_id ?? '—',
    title: order.title ?? 'Untitled Work Order',
    asset: order.asset ?? 'Unassigned Asset',
    technician: order.technician ?? 'Unassigned',
    dueDate,
    formattedDueDate: formatDate(dueDate),
    priority: normalizePriority(order.priority),
    status: normalizeStatus(order.status),
  };
}

function normalizePriority(priority?: string | null): 'High' | 'Medium' | 'Low' {
  switch ((priority || '').toUpperCase()) {
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    default:
      return 'Low';
  }
}

function normalizeStatus(status?: string | null): string {
  const normalized = (status || '').trim().toUpperCase();
  switch (normalized) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'NEW':
      return 'New';
    case 'PENDING':
      return 'Pending';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'APPROVED':
      return 'Approved';
    case 'CLOSED':
      return 'Closed';
    default:
      if (!normalized) {
        return 'Draft';
      }
      return normalized[0] + normalized.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}

function calculateOverdueCount(workOrders: DashboardRecentWorkOrder[]): number {
  if (!workOrders.length) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return workOrders.reduce((count, order) => {
    if (!order.dueDate) {
      return count;
    }
    const due = new Date(order.dueDate);
    if (Number.isNaN(due.getTime())) {
      return count;
    }

    const statusKey = order.status.replace(/\s+/g, '_').toUpperCase();
    const isClosed = statusKey === 'COMPLETED' || statusKey === 'CLOSED';

    // Overdue is any item past due today that is not completed/closed.
    return due < today && !isClosed ? count + 1 : count;
  }, 0);
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return '—';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function toNumber(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDirection(value: string | null | undefined): MetricDirection {
  const direction = (value || '').toLowerCase();
  if (direction === 'up' || direction === 'increase' || direction === 'increased') {
    return 'up';
  }
  if (direction === 'down' || direction === 'decrease' || direction === 'decreased') {
    return 'down';
  }
  return null;
}
