import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  GoodsReceiptItem,
  GoodsReceiptListResponse,
  ProcurementService
} from '../../services/procurement.service';
import { Loader } from '../loader/loader';

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
  imports: [CommonModule, FormsModule, Loader],
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
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  showEmptyState = false;
  errorMessage?: string;

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
  }

  createGoodsReceipt(): void {
    this.router.navigate(['/procurement/goods-receipts/create']);
  }

  private loadReceipts(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.receipts = [];
    this.filteredReceipts = [];
    const pageIndex = Math.max(0, this.currentPage);

    this.procurementService
      .fetchGoodsReceipts(undefined, undefined, undefined, pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: GoodsReceiptListResponse) => {
          this.zone.run(() => {
            try {
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
              this.showEmptyState = this.filteredReceipts.length === 0;
            } catch (err) {
              // Fallback: ensure UI recovers if mapping fails
              this.errorMessage = 'Unable to load goods receipts. Please try again.';
              this.receipts = [];
              this.filteredReceipts = [];
              this.totalReceipts = 0;
              this.showEmptyState = true;
              console.error(err);
            } finally {
              this.hasLoaded = true;
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.zone.run(() => {
            this.errorMessage = 'Unable to load goods receipts. Please try again.';
            this.receipts = [];
            this.filteredReceipts = [];
            this.totalReceipts = 0;
            this.showEmptyState = true;
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
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
      receivedAt: this.formatDateOnly(item.receivedAtUtc),
      updatedAt: this.formatDateOnly(item.updatedAt ?? item.createdAt),
      notes: item.notes ?? '-'
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
