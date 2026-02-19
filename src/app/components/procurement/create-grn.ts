import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { CreateGrnPayload, ProcurementService } from '../../services/procurement.service';
import { InventoryService } from '../../services/inventory.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

interface GrnLine {
  poLineId?: number;
  itemDbId?: number;
  itemId?: string;
  itemName?: string;
  orderedQty: number;
  receivedQty: number;
  returnQty: number;
  returnReason?: string;
}

@Component({
  selector: 'app-create-grn',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-grn.html',
  styleUrls: ['./create-procurement.css']
})
export class CreateGrnComponent implements OnInit {
  isSubmitting = false;
  isLoadingPoOptions = false;
  isLoadingPoLines = false;
  isPoLinesLocked = false;
  form = {
    poId: '',
    receivedByUserId: '',
    notes: ''
  };

  lines: GrnLine[] = [
    { itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0, returnReason: '' }
  ];

  itemOptions: { id: number; name: string; code?: string; uom?: string }[] = [];
  poOptions: { id: number; label: string }[] = [];

  constructor(
    private procurementService: ProcurementService,
    private inventoryService: InventoryService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchPoOptions();
    this.fetchItemOptions();
  }

  addLine(): void {
    if (this.isPoLinesLocked) {
      return;
    }
    this.lines.push({ itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0, returnReason: '' });
  }

  removeLine(index: number): void {
    if (this.isPoLinesLocked) {
      return;
    }
    if (this.lines.length === 1) {
      this.lines[0] = { itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0, returnReason: '' };
      return;
    }
    this.lines.splice(index, 1);
  }

  onPoChange(value: string): void {
    this.form.poId = value;
    const poId = Number(value);
    if (!poId) {
      this.isPoLinesLocked = false;
      this.resetManualLines();
      this.cdr.detectChanges();
      return;
    }

    this.fetchPoLines(poId);
  }

  submit(): void {
    if (!this.form.receivedByUserId || !this.hasValidLine() || this.hasMissingReturnReason()) {
      if (this.form.receivedByUserId && !this.hasValidLine()) {
        this.toastr.error('Enter Received Qty or Return Qty for at least one line.');
      }
      return;
    }

    const parsedPoId = Number(this.form.poId);
    const hasPo = parsedPoId > 0;

    const payload: CreateGrnPayload = {
      receivedByUserId: this.form.receivedByUserId,
      notes: this.form.notes || undefined,
      lines: this.lines
        .filter(line => Number(line.receivedQty) > 0 || Number(line.returnQty) > 0)
        .filter(line => Number(line.itemId || 0) > 0)
        .map(line =>
        hasPo
          ? {
              poLineId: Number(line.poLineId || line.itemId || 0),
              receivedQty: Number(line.receivedQty) || 0,
              returnQty: Number(line.returnQty) || 0,
              returnReason: Number(line.returnQty) > 0 ? (line.returnReason?.trim() || undefined) : undefined
            }
          : {
              itemId: Number(line.itemId || 0),
              orderedQty: Number(line.orderedQty) || 0,
              receivedQty: Number(line.receivedQty) || 0,
              returnQty: Number(line.returnQty) || 0,
              returnReason: Number(line.returnQty) > 0 ? (line.returnReason?.trim() || undefined) : undefined
            }
      )
    };
    if (hasPo) {
      payload.poId = parsedPoId;
    }

    this.isSubmitting = true;
    this.procurementService
      .createGrn(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('GRN created successfully.');
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/procurement/goods-receipts']), 0);
        },
        error: err => {
          console.error('Failed to create GRN', err);
          this.toastr.error('Unable to create GRN. Please try again.');
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/procurement/goods-receipts']);
  }

  hasValidLine(): boolean {
    return this.lines.some(line => Number(line.receivedQty) > 0 || Number(line.returnQty) > 0);
  }

  hasMissingReturnReason(): boolean {
    return this.lines.some(line => Number(line.returnQty) > 0 && !line.returnReason?.trim());
  }

  isReceivedQtyReadonly(line: GrnLine): boolean {
    const qty = Number(line.receivedQty ?? 0);
    return this.isPoLinesLocked && !Number.isNaN(qty) && qty !== 0;
  }

  onItemSelected(index: number): void {
    const selectedId = this.lines[index].itemId;
    const found = this.itemOptions.find(opt => String(opt.id) === selectedId);
    if (found) {
      this.lines[index].itemName = found.name;
    }
  }

  private fetchItemOptions(): void {
    this.inventoryService.fetchInventory(0, 100).subscribe({
      next: res => {
        const items = res.data?.content ?? [];
        this.itemOptions = items.map(item => ({
          id: item.id ?? 0,
          name: item.itemName ?? item.itemId ?? 'Unnamed item',
          code: item.itemId,
          uom: item.unitOfMeasure
        }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.itemOptions = [];
        this.cdr.detectChanges();
      }
    });
  }

  private fetchPoOptions(): void {
    this.isLoadingPoOptions = true;
    this.procurementService.fetchPurchaseOrders(0, 100).subscribe({
      next: res => {
        const orders = res.data?.content ?? [];
        this.poOptions = orders
          .filter(po => po?.id !== undefined && po?.id !== null)
          .map(po => ({
            id: Number(po.id),
            label: po.poNumber || `PO-${po.id}`
          }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.poOptions = [];
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isLoadingPoOptions = false;
        this.cdr.detectChanges();
      }
    });
  }

  private fetchPoLines(poId: number): void {
    this.isLoadingPoLines = true;
    this.procurementService.fetchPurchaseOrderById(poId).subscribe({
      next: res => {
        const poLines = res.data?.lines ?? [];
        this.lines = poLines.map(line => {
          const itemDbId = Number(line.itemId ?? 0);
          const itemName =
            this.itemOptions.find(opt => opt.id === itemDbId)?.name ||
            (line.remarks?.trim() || `Item ${itemDbId || ''}`);

          return {
            poLineId: Number(line.id ?? 0),
            itemDbId,
            itemId: String(itemDbId || ''),
            itemName,
            orderedQty: Number(line.orderedQty ?? 0),
            receivedQty: Number(line.receivedQty ?? 0),
            returnQty: 0,
            returnReason: ''
          };
        });

        if (this.lines.length === 0) {
          this.lines = [{ itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0, returnReason: '' }];
          this.isPoLinesLocked = false;
        } else {
          this.isPoLinesLocked = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Unable to load PO lines.');
        this.isPoLinesLocked = false;
        this.resetManualLines();
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isLoadingPoLines = false;
        this.cdr.detectChanges();
      }
    });
  }

  private resetManualLines(): void {
    this.lines = [{ itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0, returnReason: '' }];
  }
}
