import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import {
  CreatePoPayload,
  ProcurementService,
  CreatePoLine
} from '../../services/procurement.service';
import { InventoryService } from '../../services/inventory.service';
import { WorkOrderService } from '../../services/work-order.service';
import { VendorService } from '../../services/vendor.service';

interface LineItem {
  itemId: string;
  assetId: string;
  itemName: string;
  qty: number;
  uom: string;
  unitPrice: number;
}

@Component({
  selector: 'app-create-purchase-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-purchase-order.html',
  styleUrls: ['./create-procurement.css']
})
export class CreatePurchaseOrderComponent implements OnInit {
  today = new Date().toISOString().split('T')[0];
  isSubmitting = false;
  isLoadingItems = false;
  isLoadingVendors = false;

  requisition = {
    requestedBy: '',
    neededBy: this.today,
    notes: '',
    department: '',
    shippingLocation: 'WAREHOUSE',
    shippingTargetId: null as number | null
  };

  poInfo = {
    vendorId: null as number | null,
    expectedDelivery: this.today,
    remarks: ''
  };

  lineItems: LineItem[] = [
    {
      itemId: '',
      assetId: '',
      itemName: '',
      qty: 1,
      uom: 'Each',
      unitPrice: 0
    }
  ];

  itemOptions: { id: number; name: string; code?: string; uom?: string }[] = [];
  vendorOptions: { id: number; name: string }[] = [];
  warehouseOptions: { id: number; name: string }[] = [];
  workOrderOptions: { id: number; name: string }[] = [];
  isLoadingWarehouses = false;
  isLoadingWorkOrders = false;

  constructor(
    private router: Router,
    private procurementService: ProcurementService,
    private inventoryService: InventoryService,
    private vendorService: VendorService,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchItemOptions();
    this.fetchVendors();
    this.fetchWarehouses();
    this.fetchWorkOrders();
  }

  onCancel(): void {
    this.router.navigate(['/procurement/purchase-orders']);
  }

  onSubmit(): void {
    const payload = this.buildPayload();
    if (!payload.vendorId) {
      return;
    }
    this.isSubmitting = true;
    this.procurementService.createPurchaseOrder(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/procurement/purchase-orders']);
      },
      error: err => {
        console.error('Failed to create PO', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
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
      uom: 'Each',
      unitPrice: 0
    });
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length === 1) {
      this.lineItems[0] = { itemId: '', assetId: '', itemName: '', qty: 1, uom: 'Each', unitPrice: 0 };
      return;
    }
    this.lineItems.splice(index, 1);
  }

  private buildPayload(): CreatePoPayload {
    const lines: CreatePoLine[] = this.lineItems.map(line => ({
      itemId: Number(line.itemId || line.assetId) || 0,
      orderedQty: Number(line.qty) || 0,
      uom: line.uom || '',
      unitPrice: Number(line.unitPrice) || 0,
      remarks: line.itemName || ''
    }));

    return {
      vendorId: this.poInfo.vendorId ?? 0,
      expectedDeliveryDate: this.poInfo.expectedDelivery,
      remarks: this.poInfo.remarks,
      createdByUserId: this.requisition.requestedBy || '',
      neededByDate: this.requisition.neededBy,
      notes: this.requisition.notes,
      shipToType: this.requisition.shippingLocation,
      shipToWarehouseId: this.requisition.shippingLocation === 'WAREHOUSE' ? this.requisition.shippingTargetId ?? undefined : undefined,
      shipToWorkOrderId: this.requisition.shippingLocation === 'WORK_SITE' ? this.requisition.shippingTargetId ?? undefined : undefined,
      lines
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

  private fetchVendors(): void {
    this.isLoadingVendors = true;
    this.vendorService.fetchVendors(0, 50).subscribe({
      next: res => {
        const vendors = res.data?.content ?? [];
        this.vendorOptions = vendors
          .map(v => ({
            id: v.id ?? Number(v.vendorId) ?? 0,
            name: v.vendorName ?? v.vendorId ?? 'Unnamed vendor'
          }))
          .filter(v => !!v.id);
        this.isLoadingVendors = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Unable to load vendors for dropdown', err);
        this.vendorOptions = [];
        this.isLoadingVendors = false;
        this.cdr.detectChanges();
      }
    });
  }

  private fetchWarehouses(): void {
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

  private fetchWorkOrders(): void {
    this.isLoadingWorkOrders = true;
    this.workOrderService.fetchWorkOrders(0, 50).subscribe({
      next: res => {
        const list = (res as any)?.data?.workOrders ?? (res as any)?.data?.content ?? [];
        this.workOrderOptions = list
          .filter((wo: any) => wo?.id !== undefined)
          .map((wo: any) => ({ id: wo.id as number, name: wo.woTitle || wo.workOrderId || `Work Order ${wo.id}` }));
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
}
