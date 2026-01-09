import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkOrderTable } from '../work-order-table/work-order-table';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-work-order-management',
  standalone: true,
  imports: [CommonModule, WorkOrderTable],
  templateUrl: './work-order.html',
  styleUrls: ['./work-order.css']
})
export class WorkOrderManagementComponent implements OnInit {
  canCreateWorkOrders = false;

  constructor(
    private router: Router,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.canCreateWorkOrders = this.permissionService.hasPermission('WORK_ORDER', 'CREATE');
  }

  createWorkOrder(): void {
    if (!this.canCreateWorkOrders) {
      return;
    }
    this.router.navigate(['/work-orders/create']);
  }
}
