import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  GoodsReceiptDetailResponse,
  GoodsReceiptItem,
  GoodsReceiptLine,
  ProcurementService
} from '../../services/procurement.service';

interface UiGrnLine {
  id?: number;
  itemId?: number;
  itemName?: string;
  receivedQty: number;
  uom: string;
}

@Component({
  selector: 'app-view-goods-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-goods-receipt.html',
  styleUrls: ['./goods-reciept-grn.css']
})
export class ViewGoodsReceiptComponent implements OnInit {
  grnId?: string;
  grn?: GoodsReceiptItem;
  lines: UiGrnLine[] = [];
  isLoading = true;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.grnId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (this.grnId) {
      this.fetchGrn(this.grnId);
    } else {
      this.isLoading = false;
      this.errorMessage = 'Missing goods receipt id.';
    }
  }

  goBack(): void {
    this.router.navigate(['/procurement/goods-receipts']);
  }

  get statusChip(): string {
    return this.prettify(this.grn?.status) || 'Draft';
  }

  private fetchGrn(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchGoodsReceiptById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: GoodsReceiptDetailResponse) => {
          this.grn = res.data;
          this.lines = (res.data?.lines ?? []).map(line => this.mapLine(line));
        },
        error: () => {
          this.errorMessage = 'Unable to load goods receipt. Please try again.';
        }
      });
  }

  private mapLine(line: GoodsReceiptLine): UiGrnLine {
    return {
      id: line.id,
      itemId: line.itemId,
      itemName: line.itemName ?? '',
      receivedQty: Number(line.receivedQty ?? 0),
      uom: line.uom ?? ''
    };
  }

  private prettify(value?: string): string {
    if (!value) {
      return '';
    }
    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
