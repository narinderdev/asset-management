import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-work-order-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-chart.html',
  styleUrls: ['./work-order-chart.css'],
})
export class WorkOrderChart {
  statuses = [
    { label: 'Pending', value: 12, color: '#ef4444' },
    { label: 'In Progress', value: 27, color: '#f59e0b' },
    { label: 'Completed', value: 45, color: '#10b981' }
  ];
}
