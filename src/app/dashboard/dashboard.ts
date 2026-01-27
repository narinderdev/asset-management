import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCard } from '../components/stat-card/stat-card';
import { WorkOrderChart, WorkOrderStatus } from '../components/work-order-chart/work-order-chart';
import { CostChart, CostChartPoint } from '../components/cost-chart/cost-chart';
import { WorkOrderTable } from '../components/work-order-table/work-order-table';
import { ServiceRequestTable } from '../components/service-request-table/service-request-table';
import { MetricDisplay, DashboardRecentWorkOrder, DashboardRecentServiceRequest, useDashboardData } from './use-dashboard-data';
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
  apiId?: number;
  title: string;
  asset: string;
  technician: string;
  dueDate?: string | null;
  formattedDueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

interface DashboardTableServiceRequest {
  id: string;
  apiId?: number;
  title: string;
  asset: string;
  requester: string;
  requestDate?: string | null;
  formattedRequestDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCard, WorkOrderChart, CostChart, WorkOrderTable, ServiceRequestTable],
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
      this.buildStatCard('Requests Not Accepted', data?.metrics.requestsNotAccepted, loading),
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
      apiId: order.woDbId ?? undefined,
      title: order.title,
      asset: order.asset,
      technician: order.technician,
      dueDate: order.dueDate,
      formattedDueDate: order.formattedDueDate,
      priority: order.priority,
      status: order.status,
    })),
  );

  readonly recentServiceRequests = computed<DashboardTableServiceRequest[]>(() =>
    (this.state.data()?.recentServiceRequests ?? []).map((req: DashboardRecentServiceRequest) => ({
      id: req.srId,
      apiId: req.srDbId ?? undefined,
      title: req.title,
      asset: req.asset,
      requester: req.requester,
      requestDate: req.requestDate,
      formattedRequestDate: req.formattedRequestDate,
      priority: req.priority,
      status: req.status,
    })),
  );

  readonly isLoading = computed<boolean>(() => this.state.loading());
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
}
