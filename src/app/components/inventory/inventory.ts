import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryService } from '../../services/inventory.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';

interface InventoryItem {
  id?: number;
  itemId: string;
  itemName: string;
  category: string;
  manufacturer: string;
  stockLevel: number;
  reorderPoint: number;
  costPerUnit: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, DeleteModalComponent],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css']
})
export class InventoryComponent implements OnInit {
  inventory: InventoryItem[] = [];
  isLoading = false;
  errorMessage?: string;

  isDeleteModalOpen = false;
  itemToDelete?: InventoryItem;
  isDeleting = false;

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  private loadInventory(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.inventoryService
      .fetchInventory(0, 20)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.inventory = content.map(item => this.mapItem(item));
        },
        error: () => {
          this.errorMessage = 'Unable to load inventory. Please try again later.';
        }
      });
  }

  private mapItem(item: {
    id?: number;
    itemId?: string;
    itemName?: string;
    category?: string;
    manufacturer?: string;
    stockLevel?: number;
    reorderPoint?: number;
    costPerUnit?: number;
  }): InventoryItem {
    const stockLevel = item.stockLevel ?? 0;
    const reorderPoint = item.reorderPoint ?? 0;

    return {
      id: item.id,
      itemId: item.itemId ?? '—',
      itemName: item.itemName ?? 'Unnamed Item',
      category: item.category ?? 'Unknown',
      manufacturer: item.manufacturer ?? 'Unknown',
      stockLevel,
      reorderPoint,
      costPerUnit: this.formatCurrency(item.costPerUnit),
      status: this.resolveStatus(stockLevel, reorderPoint)
    };
  }

  private formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  private resolveStatus(stock: number, reorderPoint: number): InventoryItem['status'] {
    if (stock <= 0) {
      return 'Out of Stock';
    }
    if (stock <= reorderPoint) {
      return 'Low Stock';
    }
    return 'In Stock';
  }

  addVendor(): void {
    this.router.navigate(['/inventory/create']);
  }

  viewInventory(item: InventoryItem): void {
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/view', item.id]);
  }

  editInventory(item: InventoryItem): void {
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/edit', item.id]);
  }

  promptDeleteInventory(item: InventoryItem): void {
    this.itemToDelete = item;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.itemToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDeleteInventory(): void {
    if (!this.itemToDelete?.id) {
      return;
    }

    this.isDeleting = true;

    this.inventoryService.deleteInventory(this.itemToDelete.id).pipe(
      finalize(() => {
        this.isDeleting = false;
      })
    ).subscribe({
      next: () => {
        this.toastr.success('Inventory item deleted.');
        this.closeDeleteModal();
        this.loadInventory();
      },
      error: () => {
        this.toastr.error('Unable to delete inventory item. Please try again.');
        this.closeDeleteModal();
      }
    });
  }
}
