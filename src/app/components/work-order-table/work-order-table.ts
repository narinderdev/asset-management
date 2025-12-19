import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { WorkOrderService } from '../../services/work-order.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';

interface WorkOrder {
  id: string;
  apiId?: number;
  title: string;
  asset: string;
  technician: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

interface ApiWorkOrder {
  workOrderId?: string;
  id?: number;
  assetName?: string;
  assignedTechnician?: string;
  woTitle?: string;
  priority?: string;
  status?: string;
  plannedEndDateTime?: string;
  targetCompletionDate?: string;
}

@Component({
  selector: 'app-work-order-table',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './work-order-table.html',
  styleUrls: ['./work-order-table.css'],
})
export class WorkOrderTable implements OnInit {
  @Input() loadLive = false;
  workOrders: WorkOrder[] = [];
  isLoading = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  orderToDelete?: WorkOrder;
  isDeleting = false;

  constructor(
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.loadLive) {
      this.loadWorkOrders();
    } else {
      this.workOrders = this.getStaticWorkOrders();
    }
  }

  private loadWorkOrders(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.workOrderService
      .fetchWorkOrders(0, 20)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          const orders = response.data?.workOrders ?? [];
          this.workOrders = orders.map(order => this.toWorkOrder(order));
        },
        error: () => {
          this.errorMessage = 'Unable to load work orders. Please try again later.';
        }
      });
  }

  private toWorkOrder(order: ApiWorkOrder): WorkOrder {
    return {
      id: order.workOrderId ?? `WO-${order.id ?? '0000'}`,
      apiId: order.id,
      title: order.woTitle ?? 'Work Order',
      asset: order.assetName ?? 'Unassigned Asset',
      technician: order.assignedTechnician ?? 'Unassigned',
      dueDate: this.formatDate(order.plannedEndDateTime ?? order.targetCompletionDate),
      priority: this.normalizePriority(order.priority),
      status: this.normalizeStatus(order.status)
    };
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private normalizePriority(value?: string): WorkOrder['priority'] {
    switch (value?.toUpperCase()) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  private normalizeStatus(value?: string): string {
    if (!value) {
      return 'Draft';
    }

    switch (value.toUpperCase()) {
      case 'DRAFT':
        return 'Draft';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'PENDING':
        return 'Pending';
      default:
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
  }

  viewWorkOrder(order: WorkOrder): void {
    const identifier = this.getWorkOrderIdentifier(order);
    if (!identifier) {
      console.warn('Missing identifier for work order', order);
      return;
    }
    this.router.navigate(['/work-orders/view', identifier]);
  }

  editWorkOrder(order: WorkOrder): void {
    const identifier = this.getWorkOrderIdentifier(order);
    if (!identifier) {
      console.warn('Missing identifier for editing work order', order);
      return;
    }
    this.router.navigate(['/work-orders/edit', identifier]);
  }

  promptDeleteWorkOrder(order: WorkOrder): void {
    this.orderToDelete = order;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.orderToDelete = undefined;
    this.isDeleting = false;
    this.cdr.detectChanges();
  }

  confirmDeleteWorkOrder(): void {
    if (!this.orderToDelete) {
      return;
    }

    const deleteIdentifier = this.getWorkOrderIdentifier(this.orderToDelete);
    if (!deleteIdentifier) {
      this.toastr.error('Missing work order identifier.');
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;
    this.cdr.detectChanges();

    this.workOrderService.deleteWorkOrder(deleteIdentifier).subscribe({
      next: () => {
        const deletedId = this.orderToDelete?.id;
        this.toastr.success('Work order deleted successfully.');
        this.closeDeleteModal();
        if (this.loadLive) {
          this.loadWorkOrders();
        } else if (deletedId) {
          this.workOrders = this.workOrders.filter(order => order.id !== deletedId);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isDeleting = false;
        this.toastr.error('Unable to delete work order. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  private getStaticWorkOrders(): WorkOrder[] {
    return [
      {
        id: 'WO-1034',
        title: 'Replace HVAC filters',
        asset: 'Building A - Furnace',
        technician: 'Maya Patel',
        dueDate: 'Dec 18, 2025',
        priority: 'High',
        status: 'In Progress'
      },
      {
        id: 'WO-1033',
        title: 'Inspect conveyor belts',
        asset: 'Manufacturing Line 2',
        technician: 'Leo Martin',
        dueDate: 'Dec 20, 2025',
        priority: 'Medium',
        status: 'Pending'
      },
      {
        id: 'WO-1032',
        title: 'Calibrate pressure sensors',
        asset: 'Tank Farm Monitoring',
        technician: 'Rina Gomez',
        dueDate: 'Dec 22, 2025',
        priority: 'Low',
        status: 'Completed'
      }
    ];
  }

  private getWorkOrderIdentifier(order: WorkOrder): number | string | undefined {
    return order.apiId ?? order.id;
  }
}
