import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="maintenance-wrapper">
      <h1>Maintenance</h1>
      <p>This section is currently in progress.</p>
    </div>
  `,
  styles: [`
    .maintenance-wrapper {
      padding: 24px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 22px;
    }
    p {
      margin: 0;
      font-size: 16px;
      color: #4b5563;
    }
  `]
})
export class MaintenanceComponent {}
