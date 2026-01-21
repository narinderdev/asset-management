import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

import {
  ProcurementService,
  PurchaseOrderItem,
  PurchaseOrderListResponse
} from '../../services/procurement.service';
import { ToastrService } from 'ngx-toastr';

interface PurchaseOrderRow {
  id: number;
  poNumber: string;
  vendor: string;
  expectedDelivery: string;
  updatedAt: string;
  status: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-orders.html',
  styleUrls: ['./procurement.css']
})
export class PurchaseOrdersComponent implements OnInit {
  orders: PurchaseOrderRow[] = [];
  filteredOrders: PurchaseOrderRow[] = [];
  totalOrders = 0;
  currentPage = 0;
  itemsPerPage = 10;
  selectedStatus = 'ALL';
  statusOptions = ['ALL', 'Approved', 'Submitted', 'Pending Approval', 'Rejected', 'Draft', 'Completed'];
  isLoading = false;
  errorMessage?: string;

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  private loadPurchaseOrders(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchPurchaseOrders(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: PurchaseOrderListResponse) => {
          const content = response.data?.content ?? [];
          this.orders = content.map(item => this.mapOrder(item));
          this.totalOrders = response.data?.totalElements ?? this.orders.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          const apiPage = response.data?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.filterOrders();
        },
        error: () => {
          this.errorMessage = undefined;
          this.orders = [];
          this.filteredOrders = [];
          this.toastr.error('Unable to load purchase orders. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  private mapOrder(item: PurchaseOrderItem): PurchaseOrderRow {
    return {
      id: item.id ?? 0,
      poNumber: item.poNumber ?? `PO-${item.id ?? ''}`,
      vendor: item.vendorName ?? 'Unknown vendor',
      expectedDelivery: item.expectedDeliveryDate ?? '-',
      updatedAt: item.updatedAt ?? item.createdAt ?? '-',
      status: this.prettifyStatus(item.status)
    };
  }

  filterOrders(): void {
    if (this.selectedStatus === 'ALL') {
      this.filteredOrders = [...this.orders];
    } else {
      const target = this.selectedStatus.toLowerCase();
      this.filteredOrders = this.orders.filter(order => order.status.toLowerCase() === target);
    }
    this.currentPage = 0;
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('approve')) {
      return 'status-approved';
    }
    if (normalized.includes('submit') || normalized.includes('pending')) {
      return 'status-submitted';
    }
    if (normalized.includes('reject') || normalized.includes('cancel')) {
      return 'status-rejected';
    }
    if (normalized.includes('complete')) {
      return 'status-approved';
    }
    return 'status-neutral';
  }

  private prettifyStatus(value?: string): string {
    if (!value) {
      return 'Draft';
    }

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  createPurchaseOrder(): void {
    this.router.navigate(['/procurement/purchase-orders/create']);
  }

  viewOrder(order: PurchaseOrderRow): void {
    if (!order.id) {
      return;
    }
    this.router.navigate(['/procurement/purchase-orders/view', order.id]);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadPurchaseOrders();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadPurchaseOrders();
    }
  }

  get pagedOrders(): PurchaseOrderRow[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.filteredOrders.slice(start, start + this.itemsPerPage);
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
}
