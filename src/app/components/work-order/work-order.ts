import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkOrderTable } from '../work-order-table/work-order-table';
import type { WorkOrder } from '../work-order-table/work-order-table';
import { PermissionService } from '../../services/permission.service';
import { NewWorkOrderHighlightService } from '../../services/new-work-order-highlight.service';

@Component({
  selector: 'app-work-order-management',
  standalone: true,
  imports: [CommonModule, WorkOrderTable],
  templateUrl: './work-order.html',
  styleUrls: ['./work-order.css']
})
export class WorkOrderManagementComponent implements OnInit {
  canCreateWorkOrders = false;
  newlyCreatedWorkOrder: WorkOrder | null = null;
  currentListPage = 1;

  constructor(
    private router: Router,
    private permissionService: PermissionService,
    private newWorkOrderHighlightService: NewWorkOrderHighlightService
  ) {}

  ngOnInit(): void {
    this.canCreateWorkOrders = this.permissionService.hasPermission('WORK_ORDER', 'CREATE');
    this.newlyCreatedWorkOrder = this.newWorkOrderHighlightService.consume();
  }

  createWorkOrder(): void {
    if (!this.canCreateWorkOrders) {
      return;
    }
    this.router.navigate(['/work-orders/create']);
  }

  onPageChanged(page: number): void {
    this.currentListPage = page;
  }
}
