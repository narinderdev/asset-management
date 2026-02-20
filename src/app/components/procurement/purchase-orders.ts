import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
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
import { Loader } from '../loader/loader';

interface PurchaseOrderRow {
  id: number;
  poNumber: string;
  vendor: string;
  expectedDelivery: string;
  deliveredAt: string;
  status: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
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
  statusOptions = ['ALL', 'Draft', 'Issued', 'Delivered', 'Cancelled', 'Closed'];
  isLoading = false;
  hasLoaded = false;
  showEmptyState = false;
  errorMessage?: string;
  loadingRows = Array.from({ length: 5 });

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  private loadPurchaseOrders(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.orders = [];
    this.filteredOrders = [];

    this.procurementService
      .fetchPurchaseOrders(pageIndex, this.itemsPerPage)
      .subscribe({
        next: (response: PurchaseOrderListResponse) => {
          this.zone.run(() => {
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
            this.filterOrdersInternal(false);
            this.showEmptyState = this.filteredOrders.length === 0;
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.errorMessage = undefined;
            this.orders = [];
            this.filteredOrders = [];
            this.showEmptyState = true;
            this.toastr.error('Unable to load purchase orders. Please try again.');
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        complete: () => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private mapOrder(item: PurchaseOrderItem): PurchaseOrderRow {
    return {
      id: item.id ?? 0,
      poNumber: item.poNumber ?? `PO-${item.id ?? ''}`,
      vendor: item.vendorName ?? 'Unknown vendor',
      expectedDelivery: this.formatDateOnly(item.requiredByDate ?? item.expectedDeliveryDate),
      deliveredAt: this.formatDateOnly(item.deliveredAt),
      status: this.prettifyStatus(item.status)
    };
  }

  private formatDateOnly(value?: string | null): string {
    const raw = value?.trim();
    if (!raw || raw === '-') {
      return '-';
    }

    const datePrefix = /^\d{4}-\d{2}-\d{2}/.exec(raw)?.[0];
    if (datePrefix) {
      return datePrefix;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return parsed.toISOString().slice(0, 10);
  }

  filterOrders(): void {
    this.filterOrdersInternal(true);
  }

  private filterOrdersInternal(resetPage: boolean): void {
    if (this.selectedStatus === 'ALL') {
      this.filteredOrders = [...this.orders];
    } else {
      const target = this.selectedStatus.toLowerCase();
      this.filteredOrders = this.orders.filter(order => order.status.toLowerCase() === target);
    }
    if (resetPage) {
      this.currentPage = 0;
    }
    this.showEmptyState = !this.isLoading && this.filteredOrders.length === 0;
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
