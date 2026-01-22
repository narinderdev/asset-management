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
  @Input() changePercentage: number | null = null;
  @Input() changeDirection: 'up' | 'down' | null = null;
  @Input() loading = false;

  get hasChange(): boolean {
    return this.changePercentage !== null && this.changeDirection !== null;
  }
}
