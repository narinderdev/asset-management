import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCard } from '../components/stat-card/stat-card';
import { WorkOrderChart } from '../components/work-order-chart/work-order-chart';
import { CostChart } from '../components/cost-chart/cost-chart';
import { WorkOrderTable } from '../components/work-order-table/work-order-table';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatCard,
    WorkOrderChart,
    CostChart,
    WorkOrderTable
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  stats = [
    { title: 'Open Service Requests', value: 24, trend: '12% from last week', trendDirection: 'up' as const },
    { title: 'Active Work Orders', value: 24, trend: '5% from last week', trendDirection: 'down' as const },
    { title: 'Overdue Tasks', value: 24, trend: '22% from last week', trendDirection: 'up' as const },
    { title: 'Critical Assets Down', value: 3, trend: '50% from last week', trendDirection: 'down' as const }
  ];
}
