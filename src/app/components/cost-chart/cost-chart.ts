import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cost-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cost-chart.html',
  styleUrls: ['./cost-chart.css'],
})
export class CostChart {
  data = [
    { month: 'Jan', value: 58 },
    { month: 'Feb', value: 42 },
    { month: 'Mar', value: 55 },
    { month: 'Apr', value: 48 },
    { month: 'May', value: 66 },
    { month: 'Jun', value: 60 }
  ];

  get maxValue(): number {
    return this.data.reduce((max, item) => Math.max(max, item.value), 0) || 1;
  }

  barHeight(value: number): number {
    const max = this.maxValue;
    return max === 0 ? 0 : (value / max) * 100;
  }
}
