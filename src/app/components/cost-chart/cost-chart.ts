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
    { month: 'Jan', height: 58 },
    { month: 'Feb', height: 42 },
    { month: 'Mar', height: 55 },
    { month: 'Apr', height: 48 },
    { month: 'May', height: 66 },
    { month: 'Jun', height: 60 }
  ];
}
