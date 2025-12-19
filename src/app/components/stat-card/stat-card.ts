import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.css'],
})
export class StatCard {
  @Input() title = '';
  @Input() value: number | string = '';
  @Input() trend = '';
  @Input() trendDirection: 'up' | 'down' = 'up';
}
