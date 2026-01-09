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
  selectedStatus = 'ALL';
  statusOptions = ['ALL', 'Approved', 'Submitted', 'Pending Approval', 'Rejected', 'Draft', 'Completed'];
  isLoading = false;
  errorMessage?: string;

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  private loadPurchaseOrders(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchPurchaseOrders(0, 20)
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
          this.filterOrders();
        },
        error: () => {
          this.errorMessage = 'Unable to load purchase orders. Please try again.';
          this.orders = [];
          this.filteredOrders = [];
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
      return;
    }
    const target = this.selectedStatus.toLowerCase();
    this.filteredOrders = this.orders.filter(order => order.status.toLowerCase() === target);
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
    this.router.navigate(['/procurement/create']);
  }

  viewOrder(order: PurchaseOrderRow): void {
    if (!order.id) {
      return;
    }
    this.router.navigate(['/procurement/purchase-orders/view', order.id]);
  }

  editOrder(order: PurchaseOrderRow): void {
    if (!order.id) {
      return;
    }
    this.router.navigate(['/procurement/purchase-orders/view', order.id], {
      queryParams: { mode: 'edit' }
    });
  }

  deleteOrder(order: PurchaseOrderRow): void {
    // Hook delete flow here when API is ready.
    console.log('Delete purchase order', order);
  }
}
