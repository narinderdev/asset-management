import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  isLoading = false;
  errorMessage?: string;

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
  }

  createGoodsReceipt(): void {
    console.log('Navigate to create GRN (hook up route when available)');
  }

  private loadReceipts(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchGoodsReceipts()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: GoodsReceiptListResponse) => {
          const list = response.data ?? [];
          this.receipts = list.map(item => this.mapReceipt(item));
        },
        error: () => {
          this.errorMessage = 'Unable to load goods receipts. Please try again.';
          this.receipts = [];
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
    console.log('View GRN', row);
  }
}
