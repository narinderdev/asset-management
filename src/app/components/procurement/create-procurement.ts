import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcurementService, CreateMrPayload } from '../../services/procurement.service';
import { InventoryService } from '../../services/inventory.service';

interface LineItem {
  itemId: string;
  assetId: string;
  itemName: string;
  qty: number;
  uom: string;
}

@Component({
  selector: 'app-create-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-procurement.html',
  styleUrls: ['./create-procurement.css']
})
export class CreateProcurementComponent implements OnInit {
  today = new Date().toISOString().split('T')[0];

  requisition = {
    requestedBy: '',
    neededBy: this.today,
    notes: ''
  };

  lineItems: LineItem[] = [
    {
      itemId: '',
      assetId: '',
      itemName: '',
      qty: 1,
      uom: 'Each'
    }
  ];

  itemOptions: { id: number; name: string; code?: string; uom?: string }[] = [];
  isSubmitting = false;
  isLoadingItems = false;

  constructor(
    private router: Router,
    private procurementService: ProcurementService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.fetchItemOptions();
  }

  onCancel(): void {
    this.router.navigate(['/procurement']);
  }

  onCreate(): void {
    const payload = this.buildPayload();
    this.isSubmitting = true;
    this.procurementService.createMr(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/procurement']);
      },
      error: err => {
        console.error('Failed to create MR', err);
        this.isSubmitting = false;
      }
    });
  }

  onItemSelected(index: number): void {
    const selectedId = this.lineItems[index].itemId;
    const found = this.itemOptions.find(opt => String(opt.id) === selectedId);
    if (found) {
      this.lineItems[index].itemName = found.name;
      this.lineItems[index].assetId = found.code ? String(found.code) : selectedId;
      if (found.uom) {
        this.lineItems[index].uom = found.uom;
      }
    }
  }

  addLineItem(): void {
    this.lineItems.push({
      itemId: '',
      assetId: '',
      itemName: '',
      qty: 1,
      uom: 'Each'
    });
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length === 1) {
      this.lineItems[0] = { itemId: '', assetId: '', itemName: '', qty: 1, uom: 'Each' };
      return;
    }
    this.lineItems.splice(index, 1);
  }

  private buildPayload(): CreateMrPayload {
    return {
      requestedByUserId: this.requisition.requestedBy,
      neededByDate: this.requisition.neededBy,
      notes: this.requisition.notes,
      lines: this.lineItems.map(line => ({
        itemId: Number(line.itemId || line.assetId) || 0,
        requestedQty: Number(line.qty) || 0,
        uom: line.uom || '',
        remarks: line.itemName || ''
      }))
    };
  }

  private fetchItemOptions(): void {
    this.isLoadingItems = true;
    this.inventoryService.fetchInventory(0, 100).subscribe({
      next: res => {
        const items = res.data?.content ?? [];
        this.itemOptions = items.map(item => ({
          id: item.id ?? 0,
          name: item.itemName ?? item.itemId ?? 'Unnamed item',
          code: item.itemId,
          uom: item.unitOfMeasure
        }));
        this.isLoadingItems = false;
      },
      error: err => {
        console.error('Unable to load inventory items for dropdown', err);
        this.itemOptions = [];
        this.isLoadingItems = false;
      }
    });
  }
}
