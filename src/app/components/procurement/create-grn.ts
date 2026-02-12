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
  itemId?: string;
  itemName?: string;
  orderedQty: number;
  receivedQty: number;
  returnQty: number;
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
  form = {
    poId: '',
    receivedByUserId: '',
    notes: ''
  };

  lines: GrnLine[] = [
    { itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0 }
  ];

  itemOptions: { id: number; name: string; code?: string; uom?: string }[] = [];

  constructor(
    private procurementService: ProcurementService,
    private inventoryService: InventoryService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchItemOptions();
  }

  addLine(): void {
    this.lines.push({ itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0 });
  }

  removeLine(index: number): void {
    if (this.lines.length === 1) {
      this.lines[0] = { itemId: '', itemName: '', orderedQty: 0, receivedQty: 0, returnQty: 0 };
      return;
    }
    this.lines.splice(index, 1);
  }

  submit(): void {
    if (!this.form.receivedByUserId || !this.hasValidLine()) {
      return;
    }

    const payload: CreateGrnPayload = {
      receivedByUserId: this.form.receivedByUserId,
      notes: this.form.notes || undefined,
      lines: this.lines.map(line => ({
        itemId: Number(line.itemId || 0),
        orderedQty: Number(line.orderedQty) || 0,
        receivedQty: Number(line.receivedQty) || 0,
        returnQty: Number(line.returnQty) || 0
      }))
    };
    const parsedPoId = Number(this.form.poId);
    if (parsedPoId > 0) {
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
    return this.lines.some(line => Number(line.receivedQty) > 0 || Number(line.returnQty) > 0 || Number(line.orderedQty) > 0);
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
}
