import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { WorkOrderService } from '../../services/work-order.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

interface WorkOrder {
  id: string;
  apiId?: number;
  workOrderNumber?: string;
  title: string;
  asset: string;
  technician: string;
  technicianBadge?: string;
  dueDate?: string | null;
  formattedDueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
  assignedTeamName?: string;
  assignedTechnicianName?: string;
}

interface ApiWorkOrder {
  workOrderId?: string;
  id?: number;
  workOrderNumber?: string;
  workorderNumber?: string;
  assetName?: string;
  assignedTechnician?: string;
  assignedTechnicianName?: string;
  assignedTeamName?: string;
  woTitle?: string;
  priority?: string;
  status?: string;
  plannedEndDateTime?: string;
  targetCompletionDate?: string;
}

@Component({
  selector: 'app-work-order-table',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, DeleteModalComponent, Loader],
  templateUrl: './work-order-table.html',
  styleUrls: ['./work-order-table.css'],
})
export class WorkOrderTable implements OnInit, OnChanges {
  @Input() loadLive = false;
  @Input() externalWorkOrders: WorkOrder[] | null = null;
  @Input() loading = false;
  @Input() emptyMessage = 'No work orders to display.';
  @Input() showEditDelete = true;

  workOrders: WorkOrder[] = [];
  isLoading = false;
  private hasReceivedExternal = false;
  hasLoaded = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  orderToDelete?: WorkOrder;
  isDeleting = false;
  currentPage = 0;
  itemsPerPage = 10;
  totalOrders = 0;
  canViewWorkOrders = false;
  canEditWorkOrders = false;
  canDeleteWorkOrders = false;
  loadingRows = Array.from({ length: 3 });

  constructor(
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.isLoading = this.loading || (!this.loadLive && this.externalWorkOrders === null);
    this.hasLoaded = false;

    if (this.loadLive) {
      this.loadWorkOrders();
    } else if (this.externalWorkOrders !== null) {
      this.hasReceivedExternal = true;
      this.setWorkOrders(this.externalWorkOrders ?? []);
      this.hasLoaded = true;
    } else {
      this.workOrders = [];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.loadLive) {
      if ('externalWorkOrders' in changes) {
        this.hasReceivedExternal = this.externalWorkOrders !== null;
        const incoming = this.externalWorkOrders ?? [];
        if (incoming.length) {
          this.setWorkOrders(incoming);
          this.hasLoaded = true;
        } else {
          this.workOrders = [];
          this.hasLoaded = true;
        }
      }

      if ('loading' in changes) {
        this.isLoading = this.loading || !this.hasReceivedExternal;
      } else if ('externalWorkOrders' in changes) {
        this.isLoading = this.loading || !this.hasReceivedExternal;
      }
    }
  }

  private setPermissions(): void {
    this.canViewWorkOrders = this.permissionService.hasPermission('WORK_ORDER', 'VIEW');
    this.canEditWorkOrders = this.permissionService.hasPermission('WORK_ORDER', 'UPDATE');
    this.canDeleteWorkOrders = this.permissionService.hasPermission('WORK_ORDER', 'DELETE');
  }

  private loadWorkOrders(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    const pageIndex = Math.max(0, this.currentPage);

    const technicianId = this.getTechnicianIdFromStorage();
    const source$ = typeof technicianId === 'number'
      ? this.workOrderService.fetchWorkOrdersForTechnician(technicianId, pageIndex, this.itemsPerPage)
      : this.workOrderService.fetchWorkOrders(pageIndex, this.itemsPerPage);

    source$
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const orders = response.data?.workOrders ?? [];
          this.workOrders = orders.map((order) => this.toWorkOrder(order));
          this.totalOrders = response.data?.totalElements ?? this.workOrders.length;
          const apiPage = response.data?.page;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.errorMessage = undefined;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = undefined;
          this.toastr.error('Unable to load work orders. Please try again later.');
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private getTechnicianIdFromStorage(): number | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem('technicianId');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toWorkOrder(order: ApiWorkOrder): WorkOrder {
    const dueDate = order.plannedEndDateTime ?? order.targetCompletionDate ?? null;
    const teamName = order.assignedTeamName;
    const techName = order.assignedTechnicianName ?? order.assignedTechnician;
    return {
      id: order.workOrderId ?? `WO-${order.id ?? '0000'}`,
      apiId: order.id,
      workOrderNumber: order.workOrderNumber ?? order.workorderNumber ?? '',
      title: order.woTitle ?? 'Work Order',
      asset: order.assetName ?? 'Unassigned Asset',
      technician: teamName ?? techName ?? 'Unassigned',
      technicianBadge: teamName ? 'Team' : techName ? 'Technician' : '',
      assignedTeamName: teamName,
      assignedTechnicianName: techName,
      dueDate,
      formattedDueDate: this.formatDate(dueDate ?? undefined),
      priority: this.normalizePriority(order.priority),
      status: this.normalizeStatus(order.status),
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
      case 'SCHEDULED':
        return 'Scheduled';
      case 'APPROVED':
        return 'Approved';
      case 'NEW':
        return 'New';
      case 'PENDING':
        return 'Pending';
      case 'CLOSED':
        return 'Closed';
      default:
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
  }

  statusClass(status?: string): string {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'completed':
        return 'status-completed';
      case 'in progress':
      case 'in_progress':
        return 'status-progress';
      case 'pending':
        return 'status-pending';
      case 'scheduled':
        return 'status-scheduled';
      case 'approved':
        return 'status-approved';
      case 'new':
        return 'status-new';
      case 'draft':
        return 'status-draft';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-neutral';
    }
  }

  viewWorkOrder(order: WorkOrder): void {
    if (!this.canViewWorkOrders) {
      return;
    }
    const identifier = this.getWorkOrderIdentifier(order);
    if (!identifier) {
      console.warn('Missing identifier for work order', order);
      return;
    }
    this.router.navigate(['/work-orders/view', identifier]);
  }

  editWorkOrder(order: WorkOrder): void {
    if (!this.canEditWorkOrders) {
      return;
    }
    const identifier = this.getWorkOrderIdentifier(order);
    if (!identifier) {
      console.warn('Missing identifier for editing work order', order);
      return;
    }
    this.router.navigate(['/work-orders/edit', identifier]);
  }

  promptDeleteWorkOrder(order: WorkOrder): void {
    if (!this.canDeleteWorkOrders) {
      return;
    }
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
    if (!this.canDeleteWorkOrders || !this.orderToDelete) {
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
          this.workOrders = this.workOrders.filter((order) => order.id !== deletedId);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isDeleting = false;
        this.toastr.error('Unable to delete work order. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadWorkOrders();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadWorkOrders();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalOrders / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalOrders) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalOrders) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalOrders);
  }

  private setWorkOrders(orders: WorkOrder[]): void {
    this.workOrders = orders.map((order) => ({
      ...order,
      workOrderNumber: (order as any).workOrderNumber ?? (order as any).workorderNumber ?? order.workOrderNumber ?? '',
      technician: order.technician || order.assignedTechnicianName || order.assignedTeamName || 'Unassigned',
      technicianBadge: order.assignedTeamName ? 'Team' : order.assignedTechnicianName ? 'Technician' : '',
      formattedDueDate: order.formattedDueDate ?? this.formatDate(order.dueDate ?? undefined),
      priority: this.normalizePriority(order.priority),
      status: this.normalizeStatus(order.status),
    }));
  }

  private getWorkOrderIdentifier(order: WorkOrder): number | string | undefined {
    return order.apiId ?? order.id;
  }
}
