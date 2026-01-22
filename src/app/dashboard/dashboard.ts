import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCard } from '../components/stat-card/stat-card';
import { WorkOrderChart, WorkOrderStatus } from '../components/work-order-chart/work-order-chart';
import { CostChart, CostChartPoint } from '../components/cost-chart/cost-chart';
import { WorkOrderTable } from '../components/work-order-table/work-order-table';
import { MetricDisplay, DashboardRecentWorkOrder, useDashboardData } from './use-dashboard-data';
import { ToastrService } from 'ngx-toastr';

interface DashboardStatCard {
  title: string;
  value: number | string;
  trend: string;
  changePercentage: number | null;
  changeDirection: 'up' | 'down' | null;
  loading: boolean;
}

interface DashboardTableWorkOrder {
  id: string;
  title: string;
  asset: string;
  technician: string;
  dueDate?: string | null;
  formattedDueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCard, WorkOrderChart, CostChart, WorkOrderTable],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent {
  readonly state = useDashboardData();
  private lastErrorShown: string | null = null;

  readonly statCards = computed<DashboardStatCard[]>(() => {
    const data = this.state.data();
    const loading = this.state.loading() && !data;

    return [
      this.buildStatCard('Open Service Requests', data?.metrics.openServiceRequests, loading),
      this.buildStatCard('Active Work Orders', data?.metrics.activeWorkOrders, loading),
      this.buildStatCard('Overdue Tasks', data?.metrics.overdueTasks, loading),
      this.buildStatCard('Critical Assets Down', data?.metrics.criticalAssetsDown, loading),
    ];
  });

  readonly statusChartData = computed<WorkOrderStatus[]>(
    () => this.state.data()?.workOrdersByStatus.statuses ?? [],
  );

  readonly costChartItems = computed<CostChartPoint[]>(
    () => this.state.data()?.costSummary.items ?? [],
  );

  readonly costAxisLabel = computed(() => this.state.data()?.costSummary.axisLabel ?? 'USD');

  readonly recentWorkOrders = computed<DashboardTableWorkOrder[]>(() =>
    (this.state.data()?.recentWorkOrders ?? []).map((order: DashboardRecentWorkOrder) => ({
      id: order.woId,
      title: order.title,
      asset: order.asset,
      technician: order.technician,
      dueDate: order.dueDate,
      formattedDueDate: order.formattedDueDate,
      priority: order.priority,
      status: order.status,
    })),
  );

  readonly lastUpdated = computed<string | null>(() => {
    const generatedAt = this.state.data()?.metadata.generatedAt;
    return generatedAt ? this.formatTimestamp(generatedAt) : null;
  });

  readonly isRealTime = computed<boolean>(
    () => (this.state.data()?.metadata.dataFreshness || '').toLowerCase() === 'real_time',
  );

  readonly isLoading = computed<boolean>(() => this.state.loading() && !this.state.data());
  readonly error = computed<string | null>(() => this.state.error());

  constructor(private toastr: ToastrService) {
    effect(() => {
      const errorMessage = this.error();
      if (errorMessage && errorMessage !== this.lastErrorShown) {
        this.lastErrorShown = errorMessage;
        this.toastr.error(errorMessage, 'Dashboard');
      } else if (!errorMessage) {
        this.lastErrorShown = null;
      }
    });
  }

  refetch(): void {
    this.state.refetch();
  }

  private buildStatCard(
    title: string,
    metric: MetricDisplay | undefined,
    loading: boolean,
  ): DashboardStatCard {
    return {
      title,
      value: metric?.count ?? 0,
      trend: metric?.comparisonPeriod ? `vs ${metric.comparisonPeriod}` : '',
      changeDirection: metric?.changeDirection ?? null,
      changePercentage: metric?.changePercentage ?? null,
      loading,
    };
  }

  private formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
