import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import {
  CreateInventoryReconciliationPayload,
  InventoryService,
  WarehouseItem
} from '../../services/inventory.service';
import { Loader } from '../loader/loader';
import { PermissionService } from '../../services/permission.service';

interface WarehouseOption {
  id: number;
  label: string;
}

interface InventoryOption {
  id: number;
  itemName: string;
  itemId: string;
  skuNumber: string;
  stockLevel: number;
}

interface InventoryReconcileFormModel {
  warehouseId: number;
  inventoryItemId: number;
  reconcileDate: string;
  enteredBy: string;
  physicalQuantity: number | null;
  reason: string;
}

@Component({
  selector: 'app-create-inventory-reconcile',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './create-inventory-reconcile.html',
  styleUrls: ['./create-inventory.css']
})
export class CreateInventoryReconcileComponent implements OnInit {
  form: InventoryReconcileFormModel = {
    warehouseId: 0,
    inventoryItemId: 0,
    reconcileDate: '',
    enteredBy: '',
    physicalQuantity: null,
    reason: ''
  };

  warehouseOptions: WarehouseOption[] = [];
  itemOptions: InventoryOption[] = [];

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  isEditMode = false;
  hasLoadedDetails = false;
  editReconcileId?: number;

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.form = {
      ...this.form,
      reconcileDate: new Date().toISOString().slice(0, 10),
      enteredBy: this.permissionService.getCurrentUserName() || ''
    };

    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam ? Number(idParam) : 0;
    if (editId > 0) {
      this.isEditMode = true;
      this.editReconcileId = editId;
    }

    this.loadFormDependencies();
    if (this.isEditMode && this.editReconcileId) {
      this.loadReconciliationForEdit(this.editReconcileId);
    } else {
      this.hasLoadedDetails = true;
    }
  }

  onCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.router.navigate(['/inventory/reconcile']);
  }

  onCreate(): void {
    if (this.isSubmitting || this.isLoading || !this.hasLoadedDetails) {
      return;
    }

    if (!this.form.warehouseId || !this.form.inventoryItemId || !this.form.reconcileDate || !this.form.enteredBy) {
      this.errorMessage = 'Please fill all required fields.';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    this.cdr.detectChanges();

    const payload: CreateInventoryReconciliationPayload = {
      ...this.form,
      physicalQuantity: Number(this.form.physicalQuantity ?? 0)
    };

    const operation = this.isEditMode && this.editReconcileId
      ? this.inventoryService.updateInventoryReconciliation(this.editReconcileId, payload)
      : this.inventoryService.createInventoryReconciliation(payload);

    operation.subscribe({
      next: () => {
        this.toastr.success(
          this.isEditMode ? 'Inventory reconcile updated successfully.' : 'Inventory reconcile created successfully.'
        );
        this.router.navigate(['/inventory/reconcile']);
      },
      error: () => {
        this.errorMessage = this.isEditMode
          ? 'Unable to update inventory reconcile. Please try again.'
          : 'Unable to create inventory reconcile. Please try again.';
        this.toastr.error(this.errorMessage);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadFormDependencies(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    let pendingCalls = 2;
    const completeOne = () => {
      pendingCalls -= 1;
      if (pendingCalls === 0) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    };

    this.inventoryService.fetchWarehouses().subscribe({
      next: response => {
        const list: WarehouseItem[] = Array.isArray(response?.data)
          ? (response.data as WarehouseItem[])
          : Array.isArray((response as any)?.data?.content)
            ? ((response as any).data.content as WarehouseItem[])
            : [];
        this.warehouseOptions = list
          .filter(w => w?.id !== undefined)
          .map(w => ({ id: w.id as number, label: w.name || `Warehouse ${w.id}` }));
      },
      error: () => {
        this.warehouseOptions = [];
      },
      complete: completeOne
    });

    this.inventoryService.fetchInventory(0, 500).subscribe({
      next: response => {
        const items = response.data?.content ?? [];
        this.itemOptions = items
          .filter(item => item.id !== undefined)
          .map(item => ({
            id: item.id as number,
            itemName: item.itemName ?? 'Unnamed',
            itemId: item.itemId ?? '--',
            skuNumber: item.skuNumber ?? '--',
            stockLevel: item.stockLevel ?? 0
          }));
      },
      error: () => {
        this.itemOptions = [];
      },
      complete: completeOne
    });
  }

  private loadReconciliationForEdit(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.hasLoadedDetails = false;
    this.cdr.detectChanges();

    this.inventoryService.fetchInventoryReconciliationById(id).subscribe({
      next: response => {
        const item = response.data;
        if (!item) {
          this.errorMessage = response.message || 'Unable to load inventory reconcile details.';
          return;
        }

        this.form = {
          warehouseId: item.warehouseId ?? 0,
          inventoryItemId: item.inventoryItemId ?? 0,
          reconcileDate: this.formatDateForInput(item.reconcileDate),
          enteredBy: item.enteredBy || (this.permissionService.getCurrentUserName() || ''),
          physicalQuantity: item.physicalQuantity ?? null,
          reason: item.reason || ''
        };
      },
      error: () => {
        this.errorMessage = 'Unable to load inventory reconcile details.';
      },
      complete: () => {
        this.isLoading = false;
        this.hasLoadedDetails = true;
        this.cdr.detectChanges();
      }
    });
  }

  private formatDateForInput(value?: string): string {
    if (!value) {
      return '';
    }
    if (value.includes('T')) {
      return value.slice(0, 10);
    }
    return value;
  }

  get selectedItemDetails(): InventoryOption | undefined {
    if (!this.form.inventoryItemId) {
      return undefined;
    }
    return this.itemOptions.find(item => item.id === this.form.inventoryItemId);
  }
}
