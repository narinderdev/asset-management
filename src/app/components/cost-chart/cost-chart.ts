import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CostChartPoint {
  month: string;
  cost: number;
  currency?: string;
  unit?: string;
}

@Component({
  selector: 'app-cost-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cost-chart.html',
  styleUrls: ['./cost-chart.css'],
})
export class CostChart {
  @Input() data: CostChartPoint[] = [];
  @Input() axisLabel = 'USD';
  @Input() loading = false;

  get maxValue(): number {
    const max = this.data.reduce((currentMax, item) => Math.max(currentMax, item.cost ?? 0), 0);
    return max || 1;
  }

  get yTicks(): number[] {
    const max = this.data.reduce((currentMax, item) => Math.max(currentMax, item.cost ?? 0), 0);
    if (!max) {
      return [0];
    }
    const rawStep = max / 3;
    const step = this.niceStep(rawStep);
    return [step * 3, step * 2, step, 0];
  }

  barHeight(value: number): number {
    const max = this.maxValue;
    return max === 0 ? 0 : (value / max) * 100;
  }

  formatTick(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(value);
  }

  private niceStep(value: number): number {
    if (value <= 0) {
      return 1;
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const residual = value / magnitude;
    let nice = 1;
    if (residual >= 5) {
      nice = 5;
    } else if (residual >= 2) {
      nice = 2;
    } else if (residual >= 1) {
      nice = 1;
    } else {
      nice = 0.5;
    }
    return nice * magnitude;
  }
}
