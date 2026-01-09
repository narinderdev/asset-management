import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  ProcurementService,
  PurchaseOrderDetailResponse,
  PurchaseOrderItem,
  PurchaseOrderLine
} from '../../services/procurement.service';

interface UiPoLine {
  id?: number;
  itemId?: number;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  uom: string;
  remarks: string;
}

@Component({
  selector: 'app-view-purchase-order',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-purchase-order.html',
  styleUrls: ['./view-procurement.css']
})
export class ViewPurchaseOrderComponent implements OnInit {
  poId?: string;
  po?: PurchaseOrderItem;
  lines: UiPoLine[] = [];
  isLoading = true;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.poId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (this.poId) {
      this.fetchPo(this.poId);
    } else {
      this.isLoading = false;
      this.errorMessage = 'Missing purchase order id.';
    }
  }

  goBack(): void {
    this.router.navigate(['/procurement/purchase-orders']);
  }

  private fetchPo(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchPurchaseOrderById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: PurchaseOrderDetailResponse) => {
          this.po = res.data;
          this.lines = (res.data?.lines ?? []).map(line => this.mapLine(line));
        },
        error: () => {
          this.errorMessage = 'Unable to load purchase order. Please try again.';
        }
      });
  }

  get statusChip(): string {
    return this.prettify(this.po?.status) || 'Draft';
  }

  private mapLine(line: PurchaseOrderLine): UiPoLine {
    return {
      id: line.id,
      itemId: line.itemId,
      orderedQty: Number(line.orderedQty ?? 0),
      receivedQty: Number(line.receivedQty ?? 0),
      unitPrice: Number(line.unitPrice ?? 0),
      uom: line.uom ?? '',
      remarks: line.remarks ?? ''
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
