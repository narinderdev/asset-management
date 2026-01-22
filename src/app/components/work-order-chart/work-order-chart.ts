import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WorkOrderStatus {
  key?: string;
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-work-order-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-chart.html',
  styleUrls: ['./work-order-chart.css'],
})
export class WorkOrderChart {
  @Input() statuses: WorkOrderStatus[] = [];
  @Input() loading = false;

  readonly radius = 70;
  readonly circumference = 2 * Math.PI * this.radius;

  get total(): number {
    const totalValue = this.statuses.reduce(
      (sum, status) => sum + (Number.isFinite(status.value) ? Number(status.value) : 0),
      0
    );
    return totalValue > 0 ? totalValue : 1;
  }

  dashArray(value: number): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    const length = (safeValue / this.total) * this.circumference;
    const gap = Math.max(this.circumference - length, 0);
    return `${length} ${gap}`;
  }

  dashOffset(index: number): string {
    const priorValue = this.statuses
      .slice(0, index)
      .reduce(
        (sum, status) => sum + (Number.isFinite(status.value) ? Number(status.value) : 0),
        0
      );
    const offset = (priorValue / this.total) * this.circumference;
    return `${-offset}`;
  }

  trackByStatus = (_: number, status: WorkOrderStatus): string => status.key ?? status.label;
}
