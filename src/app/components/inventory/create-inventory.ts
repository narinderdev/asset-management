import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { InventoryService, CreateInventoryPayload } from '../../services/inventory.service';
import { VendorService } from '../../services/vendor.service';

interface SelectOption {
  label: string;
  value: string | number | boolean;
}

interface InventoryItemForm {
  itemId: string;
  itemName: string;
  category: string;
  unitOfMeasure: string;
  manufacturer: string;
  manufacturerPartNumber: string;
  stockLevel: string | number;
  reorderPoint: string | number;
  reorderQuantity: string | number;
  costPerUnit: string | number;
  minStockLevel: string | number;
  maxStockLevel: string | number;
  primaryVendorDbId: number | null;
  active: boolean;
}

@Component({
  selector: 'app-create-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          itemName: item.itemName ?? '',
          category: item.category ?? 'BEARING',
          unitOfMeasure: item.unitOfMeasure ?? 'EACH',
          manufacturer: item.manufacturer ?? '',
          manufacturerPartNumber: item.manufacturerPartNumber ?? '',
          stockLevel: item.stockLevel ?? 0,
          reorderPoint: item.reorderPoint ?? 0,
          reorderQuantity: item.reorderQuantity ?? 0,
          costPerUnit: item.costPerUnit ?? 0,
          minStockLevel: item.minStockLevel ?? 0,
          maxStockLevel: item.maxStockLevel ?? 0,
          primaryVendorDbId: item.primaryVendorDbId ?? null,
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
      itemName: this.inventoryItem.itemName,
      category: this.inventoryItem.category,
      unitOfMeasure: this.inventoryItem.unitOfMeasure,
      manufacturer: this.inventoryItem.manufacturer,
      manufacturerPartNumber: this.inventoryItem.manufacturerPartNumber,
      stockLevel: Number(this.inventoryItem.stockLevel),
      reorderPoint: Number(this.inventoryItem.reorderPoint),
      reorderQuantity: Number(this.inventoryItem.reorderQuantity),
      costPerUnit: Number(this.inventoryItem.costPerUnit),
      minStockLevel: Number(this.inventoryItem.minStockLevel),
      maxStockLevel: Number(this.inventoryItem.maxStockLevel),
      primaryVendorDbId: this.inventoryItem.primaryVendorDbId ?? undefined,
      active: Boolean(this.inventoryItem.active)
    };

    if (this.isEditMode || !this.autoGenerateItemId) {
      payload.itemId = this.inventoryItem.itemId;
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
      itemName: '',
      category: '',
      unitOfMeasure: '',
      manufacturer: '',
      manufacturerPartNumber: '',
      stockLevel: '',
      reorderPoint: '',
      reorderQuantity: '',
      costPerUnit: '',
      minStockLevel: '',
      maxStockLevel: '',
      primaryVendorDbId: null as number | null,
      active: true
    };
  }
}
