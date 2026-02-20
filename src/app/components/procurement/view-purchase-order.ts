import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';

import {
  ProcurementService,
  PurchaseOrderDetailResponse,
  PurchaseOrderItem,
  PurchaseOrderLine,
  UpdatePoStatusPayload
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
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './view-purchase-order.html',
  styleUrls: ['./view-purchase-order.css']
})
export class ViewPurchaseOrderComponent implements OnInit {
  poId?: string;
  po?: PurchaseOrderItem;
  lines: UiPoLine[] = [];
  isLoading = true;
  errorMessage?: string;
  isMarkDeliveredOpen = false;
  isMarking = false;
  isCreateGrnOpen = false;
  grnForm = {
    receivedBy: '',
    receivedAt: '',
    notes: '',
    lines: [] as {
      poLineId?: number;
      itemId?: number;
      receiveNow: number;
      orderedQty: number;
      receivedQty: number;
      returnQty: number;
      uom: string;
    }[]
  };
  isSubmittingGrn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
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

  openMarkDelivered(): void {
    this.isMarkDeliveredOpen = true;
  }

  closeMarkDelivered(): void {
    this.isMarkDeliveredOpen = false;
  }

  confirmMarkDelivered(): void {
    if (!this.poId || this.isMarking) {
      return;
    }
    const payload: UpdatePoStatusPayload = {
      newStatus: 'DELIVERED',
      remarks: ''
    };
    this.isMarking = true;
    this.procurementService
      .updatePurchaseOrderStatus(this.poId, payload)
      .pipe(
        finalize(() => {
          this.isMarking = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('PO marked as delivered');
          this.closeMarkDelivered();
          this.cdr.detectChanges();
          this.fetchPo(this.poId as string);
        },
        error: () => {
          this.toastr.error('Unable to update PO status');
        }
      });
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
          this.prepareGrnLines();
        },
        error: () => {
          this.errorMessage = 'Unable to load purchase order. Please try again.';
        }
      });
  }

  get statusChip(): string {
    return this.prettify(this.po?.status) || 'Draft';
  }

  get isDraft(): boolean {
    return (this.po?.status || '').toUpperCase() === 'DRAFT';
  }

  get isDelivered(): boolean {
    return (this.po?.status || '').toUpperCase() === 'DELIVERED';
  }

  get isIssued(): boolean {
    return (this.po?.status || '').toUpperCase() === 'ISSUED';
  }

  get canMarkDelivered(): boolean {
    return this.isDraft || this.isIssued;
  }

  formatDateOnly(value?: string | null): string {
    const raw = value?.trim();
    if (!raw || raw === '-') {
      return '—';
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

  createGrn(): void {
    this.isCreateGrnOpen = true;
    if (!this.grnForm.receivedAt) {
      this.grnForm.receivedAt = new Date().toISOString().slice(0, 16);
    }
  }

  closeCreateGrn(): void {
    this.isCreateGrnOpen = false;
  }

  submitGrn(): void {
    if (!this.poId) {
      this.toastr.error('Missing PO id.');
      return;
    }
    const payload = this.buildGrnPayload();
    if (!payload.lines.length) {
      this.toastr.error('Please enter at least one receive quantity.');
      return;
    }
    this.isSubmittingGrn = true;
    this.procurementService
      .createGrn(payload)
      .pipe(
        finalize(() => {
          this.isSubmittingGrn = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('GRN created successfully.');
          this.closeCreateGrn();
          this.router.navigate(['/procurement/goods-receipts']);
        },
        error: () => {
          this.toastr.error('Unable to create GRN. Please try again.');
        }
      });
  }

  private prepareGrnLines(): void {
    this.grnForm.lines = this.lines.map(line => ({
      poLineId: line.id,
      itemId: line.itemId,
      orderedQty: line.orderedQty,
      receivedQty: line.receivedQty,
      receiveNow: 0,
      returnQty: 0,
      uom: line.uom
    }));
  }

  private buildGrnPayload() {
    const poId = Number(this.poId);
    const hasPo = Number.isFinite(poId) && poId > 0;

    const lines = this.grnForm.lines
      .filter(l => Number(l.receiveNow) > 0 && (hasPo ? l.poLineId !== undefined : l.itemId !== undefined))
      .map(l =>
        hasPo
          ? {
              poLineId: Number(l.poLineId),
              receivedQty: Number(l.receiveNow),
              returnQty: Number(l.returnQty || 0)
            }
          : {
              itemId: Number(l.itemId),
              orderedQty: Number(l.orderedQty || 0),
              receivedQty: Number(l.receiveNow),
              returnQty: Number(l.returnQty || 0)
            }
      );

    return {
      ...(hasPo ? { poId } : {}),
      receivedByUserId: this.grnForm.receivedBy || '',
      notes: this.grnForm.notes || '',
      lines
    };
  }
}
