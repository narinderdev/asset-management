import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ProcurementService, CreateMrPayload, PurchaseRequisitionItem, PurchaseRequisitionLine } from '../../services/procurement.service';
import { InventoryService } from '../../services/inventory.service';
import { WorkOrderService } from '../../services/work-order.service';

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
  isEditMode = false;
  mrId?: string;

  requisition = {
    requestedBy: '',
    neededBy: this.today,
    notes: '',
    department: '',
    shippingLocation: 'WAREHOUSE',
    shippingTargetId: null as number | null
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

  itemOptions: { id: number; name: string; code?: string; uom?: string; itemId?: string }[] = [];
  warehouseOptions: { id: number; name: string }[] = [];
  workOrderOptions: { id: number; name: string }[] = [];
  isSubmitting = false;
  isLoadingItems = false;
  isLoadingWarehouses = false;
  isLoadingWorkOrders = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private procurementService: ProcurementService,
    private inventoryService: InventoryService,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.mrId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.mrId;
    this.fetchItemOptions();
    this.fetchWarehouseOptions();
    this.fetchWorkOrderOptions();
    if (this.isEditMode && this.mrId) {
      this.loadExistingMr(this.mrId);
    }
  }

  onCancel(): void {
    this.router.navigate(['/procurement']);
  }

  onSubmit(): void {
    if (this.isEditMode && this.mrId) {
      this.onUpdate(this.mrId);
    } else {
      this.onCreate();
    }
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

  private onUpdate(id: string): void {
    const payload = this.buildPayload();
    this.isSubmitting = true;
    this.procurementService
      .updateMr(id, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/procurement']);
        },
        error: err => {
          console.error('Failed to update MR', err);
        }
      });
  }

  onItemSelected(index: number): void {
    const selectedId = this.lineItems[index].itemId;
    const found = this.itemOptions.find(opt => String(opt.id) === String(selectedId));
    if (found) {
      this.lineItems[index].itemName = found.name || '';
      const itemCode = found.code ?? found.itemId ?? found.name ?? '';
      this.lineItems[index].assetId = itemCode;
      this.lineItems[index].uom = found.uom || 'Each';
      if (!this.lineItems[index].qty || this.lineItems[index].qty <= 0) {
        this.lineItems[index].qty = 1;
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
      shipToType: this.requisition.shippingLocation,
      shipToWarehouseId: this.requisition.shippingLocation === 'WAREHOUSE' ? this.requisition.shippingTargetId ?? undefined : undefined,
      shipToWorkOrderId: this.requisition.shippingLocation === 'WORK_SITE' ? this.requisition.shippingTargetId ?? undefined : undefined,
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
          itemId: item.itemId,
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

  private fetchWarehouseOptions(): void {
    this.isLoadingWarehouses = true;
    this.inventoryService.fetchWarehouses().subscribe({
      next: res => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res as any)?.data?.content)
            ? (res as any).data.content
            : [];
        this.warehouseOptions = list
          .filter((w: any) => w?.id !== undefined)
          .map((w: any) => ({ id: w.id as number, name: w.name || `Warehouse ${w.id}` }));
      },
      error: err => {
        console.error('Unable to load warehouses', err);
        this.warehouseOptions = [];
      },
      complete: () => {
        this.isLoadingWarehouses = false;
        this.cdr.detectChanges();
      }
    });
  }

  private fetchWorkOrderOptions(): void {
    this.isLoadingWorkOrders = true;
    this.workOrderService.fetchWorkOrders(0, 50).subscribe({
      next: res => {
        const list = (res as any)?.data?.workOrders ?? (res as any)?.data?.content ?? [];
        this.workOrderOptions = list
          .filter((wo: any) => wo?.id !== undefined)
          .map((wo: any) => ({
            id: wo.id as number,
            name: wo.woTitle || wo.workOrderId || `Work Order ${wo.id}`
          }));
      },
      error: err => {
        console.error('Unable to load work orders', err);
        this.workOrderOptions = [];
      },
      complete: () => {
        this.isLoadingWorkOrders = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadExistingMr(id: string): void {
    this.procurementService.fetchMrById(id).subscribe({
      next: res => {
        const data: PurchaseRequisitionItem | undefined = res.data;
        if (!data) {
          return;
        }
        this.requisition = {
          requestedBy: data.requestedByUserId || '',
          neededBy: this.formatDateForInput(data.neededByDate) || this.today,
          notes: data.notes || '',
          department: (data as any)?.department || '',
          shippingLocation: (data as any)?.shipToType || (data as any)?.shippingLocation || 'WAREHOUSE',
          shippingTargetId: (data as any)?.shipToWarehouseId ?? (data as any)?.shipToWorkOrderId ?? null
        };
        const lines = data.lines || [];
        this.lineItems = lines.length
          ? lines.map(line => this.mapLine(line))
          : [
              {
                itemId: '',
                assetId: '',
                itemName: '',
                qty: 1,
                uom: 'Each'
              }
            ];
        // Ensure template updates after async patching values
        this.lineItems = [...this.lineItems];
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Unable to load MR for edit', err);
      }
    });
  }

  private mapLine(line: PurchaseRequisitionLine): LineItem {
    return {
      itemId: line.itemId ? String(line.itemId) : '',
      assetId: line.assetId ? String(line.assetId) : '',
      itemName: line.itemName || line.description || line.remarks || '',
      qty: Number(
        line.requestedQty ??
        line.qtyRequested ??
        line.quantity ??
        0
      ) || 0,
      uom: line.uom || 'Each'
    };
  }

  private formatDateForInput(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    // Fallback for DD-MM-YYYY
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [_, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }
}
