import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkOrderTable } from '../work-order-table/work-order-table';

@Component({
  selector: 'app-work-order-management',
  standalone: true,
  imports: [CommonModule, WorkOrderTable],
  templateUrl: './work-order.html',
  styleUrls: ['./work-order.css']
})
export class WorkOrderManagementComponent {
  constructor(private router: Router) {}

  createWorkOrder(): void {
    this.router.navigate(['/work-orders/create']);
  }
}
