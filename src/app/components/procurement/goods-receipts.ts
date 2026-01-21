import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  GoodsReceiptItem,
  GoodsReceiptListResponse,
  ProcurementService
} from '../../services/procurement.service';

interface GoodsReceiptRow {
  id: number;
  grnNumber: string;
  poId: string;
  vendorId: string;
  receivedBy: string;
  receivedAt: string;
  updatedAt: string;
  notes: string;
}

@Component({
  selector: 'app-goods-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './goods-receipts.html',
  styleUrls: ['./procurement.css']
})
export class GoodsReceiptsComponent implements OnInit {
  receipts: GoodsReceiptRow[] = [];
  filteredReceipts: GoodsReceiptRow[] = [];
  totalReceipts = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  errorMessage?: string;

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
  }

  createGoodsReceipt(): void {
    this.router.navigate(['/procurement/goods-receipts/create']);
  }

  private loadReceipts(): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    const pageIndex = Math.max(0, this.currentPage);

    this.procurementService
      .fetchGoodsReceipts(undefined, undefined, undefined, pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: GoodsReceiptListResponse) => {
          const raw = response.data?.content ?? response.data ?? [];
          const content: GoodsReceiptItem[] = Array.isArray(raw) ? raw : [];
          this.receipts = content.map((item: GoodsReceiptItem) => this.mapReceipt(item));
          this.filteredReceipts = [...this.receipts];
          this.totalReceipts = response.data && 'totalElements' in response.data
            ? (response.data.totalElements ?? this.filteredReceipts.length)
            : this.filteredReceipts.length;
          if (typeof (response.data as any)?.size === 'number' && (response.data as any).size > 0) {
            this.itemsPerPage = (response.data as any).size;
          }
          const apiPage = (response.data as any)?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load goods receipts. Please try again.';
          this.receipts = [];
          this.filteredReceipts = [];
          this.totalReceipts = 0;
        }
      });
  }

  private mapReceipt(item: GoodsReceiptItem): GoodsReceiptRow {
    return {
      id: item.id ?? 0,
      grnNumber: item.grnNumber ?? `GRN-${item.id ?? ''}`,
      poId: item.poId !== undefined && item.poId !== null ? String(item.poId) : '-',
      vendorId: item.vendorId !== undefined && item.vendorId !== null ? String(item.vendorId) : '-',
      receivedBy: item.receivedByUserId ?? '-',
      receivedAt: item.receivedAtUtc ?? '-',
      updatedAt: item.updatedAt ?? item.createdAt ?? '-',
      notes: item.notes ?? '-'
    };
  }

  viewReceipt(row: GoodsReceiptRow): void {
    this.router.navigate(['/procurement/goods-receipts/view', row.id]);
  }

  get pagedReceipts(): GoodsReceiptRow[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.filteredReceipts.slice(start, start + this.itemsPerPage);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadReceipts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadReceipts();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalReceipts / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalReceipts) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalReceipts) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalReceipts);
  }
}
