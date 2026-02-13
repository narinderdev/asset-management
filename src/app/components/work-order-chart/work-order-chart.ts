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

  private get total(): number {
    const totalValue = this.statuses.reduce(
      (sum, status) => sum + (Number.isFinite(status.value) ? Number(status.value) : 0),
      0
    );
    return totalValue > 0 ? totalValue : 1;
  }

  donutGradient(): string {
    if (!this.statuses.length) {
      return '#eef2f7';
    }

    let cursor = 0;
    const slices: string[] = [];
    const seamOverlap = 0.2;

    this.statuses.forEach((status, index) => {
      const value = Number.isFinite(status.value) ? Number(status.value) : 0;
      if (value <= 0) {
        return;
      }

      const start = cursor;
      let end = start + (value / this.total) * 360;
      if (index < this.statuses.length - 1) {
        end = Math.min(end + seamOverlap, 360);
      }

      slices.push(`${status.color} ${start}deg ${end}deg`);
      cursor = start + (value / this.total) * 360;
    });

    if (!slices.length) {
      return '#eef2f7';
    }

    return `conic-gradient(from -90deg, ${slices.join(', ')})`;
  }

  trackByStatus = (_: number, status: WorkOrderStatus): string => status.key ?? status.label;
}
