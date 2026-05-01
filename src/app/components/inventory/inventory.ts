import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryService } from '../../services/inventory.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

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
  imports: [CommonModule, DeleteModalComponent, Loader],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css']
})
export class InventoryComponent implements OnInit {
  inventory: InventoryItem[] = [];
  totalInventory = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  showEmptyState = false;

  isDeleteModalOpen = false;
  itemToDelete?: InventoryItem;
  isDeleting = false;
  canCreateInventory = false;
  canEditInventory = false;
  canDeleteInventory = false;

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadInventory();
  }

  private setPermissions(): void {
    this.canCreateInventory = this.permissionService.hasPermission('INVENTORY', 'CREATE');
    this.canEditInventory = this.permissionService.hasPermission('INVENTORY', 'UPDATE');
    this.canDeleteInventory = this.permissionService.hasPermission('INVENTORY', 'DELETE');
  }

  private loadInventory(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.inventory = [];

    this.inventoryService
      .fetchInventory(pageIndex, this.itemsPerPage)
      .subscribe({
        next: response => {
          this.zone.run(() => {
            const content = response.data?.content ?? [];
            this.inventory = content.map(item => this.mapItem(item));
            this.showEmptyState = this.inventory.length === 0;
            this.totalInventory = response.data?.totalElements ?? this.inventory.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.itemsPerPage = response.data.size;
            }
            const apiPage = response.data?.number;
            if (typeof apiPage === 'number') {
              this.currentPage = apiPage;
            }
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.errorMessage = undefined;
            this.toastr.error('Unable to load inventory. Please try again later.');
            this.inventory = [];
            this.showEmptyState = true;
            this.totalInventory = 0;
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        complete: () => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadInventory();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadInventory();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalInventory / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalInventory) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalInventory) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalInventory);
  }

  formatLabel(value?: string): string {
    if (!value) {
      return 'Unknown';
    }
    const normalized = value.replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
      category: this.formatLabel(item.category),
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

  addInventoryItem(): void {
    if (!this.canCreateInventory) {
      return;
    }
    this.router.navigate(['/inventory/create']);
  }

  viewInventory(item: InventoryItem): void {
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/view', item.id]);
  }

  editInventory(item: InventoryItem): void {
    if (!this.canEditInventory) {
      return;
    }
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/edit', item.id]);
  }

  promptDeleteInventory(item: InventoryItem): void {
    if (!this.canDeleteInventory) {
      return;
    }
    this.itemToDelete = item;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.itemToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDeleteInventory(): void {
    if (!this.canDeleteInventory || !this.itemToDelete?.id) {
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
