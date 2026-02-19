import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, take } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Loader } from '../loader/loader';
import { ProcurementService, ReturnTransactionItem } from '../../services/procurement.service';

interface ReturnTransactionRow {
  id: number;
  grnNumber: string;
  itemName: string;
  itemId: string;
  receivedQty: number;
  returnQty: number;
  totalReturnedQty: number;
  unitCost: number;
  returnCost: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

@Component({
  selector: 'app-return-transactions',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './return-transactions.html',
  styleUrls: ['./procurement.css', './return-transactions.css']
})
export class ReturnTransactionsComponent implements OnInit {
  rows: ReturnTransactionRow[] = [];
  isLoading = false;
  hasLoaded = false;
  showEmptyState = false;
  errorMessage?: string;
  apiMessage = '';
  loadingRows = Array.from({ length: 6 });

  constructor(
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      this.hasLoaded = true;
      this.cdr.detectChanges();
      return;
    }
    this.loadReturnTransactions();
  }

  refresh(): void {
    if (this.isLoading) {
      return;
    }
    this.loadReturnTransactions();
  }

  private loadReturnTransactions(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.apiMessage = '';
    this.rows = [];

    this.procurementService
      .fetchReturnTransactions()
      .pipe(
        take(1),
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const content = Array.isArray(response.data) ? response.data : [];
          this.rows = content.map(item => this.mapRow(item));
          this.apiMessage = response.message || '';
          this.showEmptyState = this.rows.length === 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load return transactions. Please try again.';
          this.rows = [];
          this.showEmptyState = true;
          this.cdr.detectChanges();
        }
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  private mapRow(item: ReturnTransactionItem): ReturnTransactionRow {
    return {
      id: item.id ?? 0,
      grnNumber: item.grnNumber || '-',
      itemName: item.itemName || '-',
      itemId: item.itemId || '-',
      receivedQty: item.receivedQty ?? 0,
      returnQty: item.returnQty ?? 0,
      totalReturnedQty: item.totalReturnedQty ?? 0,
      unitCost: item.unitCost ?? 0,
      returnCost: item.returnCost ?? 0,
      reason: item.reason || '-',
      performedBy: item.performedBy || '-',
      createdAt: item.createdAt || '-'
    };
  }
}
