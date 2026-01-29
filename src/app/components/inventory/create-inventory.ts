import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { InventoryService, CreateInventoryPayload, WarehouseItem } from '../../services/inventory.service';
import { VendorService } from '../../services/vendor.service';
import { Loader } from '../loader/loader';

interface SelectOption {
  label: string;
  value: string | number | boolean;
}

interface InventoryItemForm {
  itemId: string;
  skuNumber: string;
  itemName: string;
  category: string;
  unitOfMeasure: string;
  manufacturer: string;
  glAccountString: string;
  expenseCode: string;
  manufacturerPartNumber: string;
  stockLevel: string | number;
  reorderPoint: string | number;
  reorderQuantity: string | number;
  costPerUnit: string | number;
  minStockLevel: string | number;
  maxStockLevel: string | number;
  primaryVendorDbId: number | null;
  warehouseId: number | null;
  active: boolean;
}

@Component({
  selector: 'app-create-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './create-inventory.html',
  styleUrls: ['./create-inventory.css']
})
export class CreateInventoryComponent implements OnInit {
  inventoryItem: InventoryItemForm = this.createInventoryDefaults();
  autoGenerateItemId = false;

  categoryOptions: SelectOption[] = [
    { label: 'Bearing', value: 'BEARING' },
    { label: 'Belt', value: 'BELT' },
    { label: 'Filter', value: 'FILTER' },
    { label: 'Electrical', value: 'ELECTRICAL' },
    { label: 'Mechanical', value: 'MECHANICAL' },
    { label: 'Other', value: 'OTHER' }
  ];

  unitOptions: SelectOption[] = [
    { label: 'Each', value: 'EACH' },
    { label: 'Meter', value: 'METER' },
    { label: 'Box', value: 'BOX' }
  ];

  vendorOptions: Array<{ label: string; id: number }> = [];
  warehouseOptions: Array<{ label: string; id: number }> = [];
  activeOptions: SelectOption[] = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  isSubmitting = false;
  errorMessage?: string;
  isEditMode = false;
  isLoadingDetails = false;
  hasLoadedDetails = false;
  editItemId?: number;
  isLoadingWarehouses = false;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private vendorService: VendorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.autoGenerateItemId = false;
    this.loadVendorOptions();
    this.loadWarehouseOptions();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.hasLoadedDetails = false;
      this.loadInventoryForEdit(id);
    } else {
      this.hasLoadedDetails = true;
    }
  }

  private loadVendorOptions(): void {
    this.vendorService.fetchVendors(0, 50).subscribe({
      next: response => {
        const content = response.data?.content ?? [];
        this.vendorOptions = content
          .filter(vendor => vendor.id !== undefined)
          .map(vendor => ({
            id: vendor.id as number,
            label: vendor.vendorName ?? vendor.vendorId ?? `Vendor ${vendor.id}`
          }));
      },
      error: () => {
        this.vendorOptions = [];
      }
    });
  }

  private loadWarehouseOptions(): void {
    this.isLoadingWarehouses = true;
    this.inventoryService.fetchWarehouses().subscribe({
      next: response => {
        const list: WarehouseItem[] = Array.isArray(response?.data)
          ? (response.data as WarehouseItem[])
          : Array.isArray((response as any)?.data?.content)
            ? ((response as any).data.content as WarehouseItem[])
            : [];
        this.warehouseOptions = list
          .filter((w: WarehouseItem) => w?.id !== undefined)
          .map((w: WarehouseItem) => ({ id: w.id as number, label: w.name || `Warehouse ${w.id}` }));
      },
      error: () => {
        this.warehouseOptions = [];
      },
      complete: () => {
        this.isLoadingWarehouses = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadInventoryForEdit(id: string): void {
    this.isLoadingDetails = true;
    this.inventoryService.fetchInventoryItemById(id).subscribe({
      next: response => {
        const item = response.data;
        if (!item) {
          this.errorMessage = response.message ?? 'Unable to load inventory item for editing.';
          this.hasLoadedDetails = true;
          return;
        }

        this.isEditMode = true;
        this.editItemId = item.id;
        this.autoGenerateItemId = false;
        this.inventoryItem = {
          ...this.createInventoryDefaults(),
          itemId: item.itemId ?? '',
          skuNumber: (item as any).skuNumber ?? '',
          itemName: item.itemName ?? '',
          category: item.category ?? 'BEARING',
          unitOfMeasure: item.unitOfMeasure ?? 'EACH',
          manufacturer: item.manufacturer ?? '',
          glAccountString: (item as any).glAccountString ?? '',
          expenseCode: (item as any).expenseCode ?? '',
          manufacturerPartNumber: item.manufacturerPartNumber ?? '',
          stockLevel: item.stockLevel ?? 0,
          reorderPoint: item.reorderPoint ?? 0,
          reorderQuantity: item.reorderQuantity ?? 1,
          costPerUnit: item.costPerUnit ?? 0,
          minStockLevel: item.minStockLevel ?? 0,
          maxStockLevel: item.maxStockLevel ?? 0,
          primaryVendorDbId: item.primaryVendorDbId ?? null,
          warehouseId: (item as any).warehouseId ?? null,
          active: item.active ?? true
        };
      },
      error: () => {
        this.errorMessage = 'Unable to load inventory item for editing.';
      },
      complete: () => {
        this.isLoadingDetails = false;
        this.hasLoadedDetails = true;
        this.cdr.detectChanges();
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/inventory']);
  }

  onAutoGenerateItemIdChange(): void {
    if (this.autoGenerateItemId) {
      this.inventoryItem.itemId = '';
    }
  }

  onCreate(): void {
    if (this.isSubmitting || !this.hasLoadedDetails) {
      return;
    }

    this.errorMessage = undefined;
    this.isSubmitting = true;

    const payload: CreateInventoryPayload = {
      itemId: this.inventoryItem.itemId ?? '',
      skuNumber: this.inventoryItem.skuNumber ?? '',
      itemName: this.inventoryItem.itemName,
      category: this.inventoryItem.category,
      unitOfMeasure: this.inventoryItem.unitOfMeasure || 'EACH',
      manufacturer: this.inventoryItem.manufacturer,
      glAccountString: this.inventoryItem.glAccountString || undefined,
      expenseCode: this.inventoryItem.expenseCode || undefined,
      manufacturerPartNumber: this.inventoryItem.manufacturerPartNumber,
      stockLevel: Number(this.inventoryItem.stockLevel || 0),
      reorderPoint: Number(this.inventoryItem.reorderPoint || 0),
      reorderQuantity: Number(this.inventoryItem.reorderQuantity || 1),
      costPerUnit: Number(this.inventoryItem.costPerUnit || 0),
      minStockLevel: Number(this.inventoryItem.minStockLevel || 0),
      maxStockLevel: Number(this.inventoryItem.maxStockLevel || 0),
      primaryVendorDbId: this.inventoryItem.primaryVendorDbId ?? 0,
      warehouseId: this.inventoryItem.warehouseId ?? 0,
      active: Boolean(this.inventoryItem.active)
    };
    // Keep itemId key present; backend may auto-generate when empty string
    if (!this.isEditMode && this.autoGenerateItemId) {
      payload.itemId = '';
    }

    const operation = this.isEditMode && this.editItemId
      ? this.inventoryService.updateInventory(this.editItemId, payload)
      : this.inventoryService.createInventory(payload);

    const failureMsg = this.isEditMode
      ? 'Unable to update inventory item. Please try again.'
      : 'Unable to create inventory item. Please try again.';

    operation.subscribe({
      next: () => {
        this.router.navigate(['/inventory']);
      },
      error: () => {
        this.errorMessage = failureMsg;
        this.isSubmitting = false;
      }
    });
  }

  private createInventoryDefaults(): InventoryItemForm {
    return {
      itemId: '',
      skuNumber: '',
      itemName: '',
      category: 'BEARING',
      unitOfMeasure: 'EACH',
      manufacturer: '',
      glAccountString: '',
      expenseCode: '',
      manufacturerPartNumber: '',
      stockLevel: 0,
      reorderPoint: 0,
      reorderQuantity: 1,
      costPerUnit: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      primaryVendorDbId: null as number | null,
      warehouseId: null as number | null,
      active: true
    };
  }
}
