import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { InventoryReconciliationItem, InventoryService } from '../../services/inventory.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-inventory-reconcile',
  standalone: true,
  imports: [CommonModule, Loader, DeleteModalComponent],
  templateUrl: './inventory-reconcile.html',
  styleUrls: ['./inventory-reconcile.css']
})
export class InventoryReconcileComponent implements OnInit {
  reconciliations: InventoryReconciliationItem[] = [];
  isLoading = false;
  hasLoaded = false;
  errorMessage = '';
  currentPage = 0;
  itemsPerPage = 10;
  totalElements = 0;
  isDeleteModalOpen = false;
  isDeleting = false;
  reconcileToDelete?: InventoryReconciliationItem;

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadReconciliations();
  }

  loadReconciliations(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.inventoryService
      .fetchInventoryReconciliations(this.currentPage, this.itemsPerPage)
      .subscribe({
        next: (response) => {
          this.reconciliations = response.data?.content ?? [];
          this.totalElements = response.data?.totalElements ?? this.reconciliations.length;
          this.currentPage = response.data?.number ?? this.currentPage;
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.reconciliations = [];
          this.totalElements = 0;
          this.errorMessage = 'Unable to load inventory reconciliations.';
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        },
        complete: () => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadReconciliations();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadReconciliations();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalElements) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalElements) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalElements);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  openCreateReconcile(): void {
    this.router.navigate(['/inventory/reconcile/create']);
  }

  viewReconcile(row: InventoryReconciliationItem): void {
    if (!row.id) {
      return;
    }
    this.router.navigate(['/inventory/reconcile/view', row.id]);
  }

  editReconcile(row: InventoryReconciliationItem): void {
    if (!row.id) {
      return;
    }
    this.router.navigate(['/inventory/reconcile/edit', row.id]);
  }

  deleteReconcile(row: InventoryReconciliationItem): void {
    if (!row.id) {
      return;
    }
    this.reconcileToDelete = row;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.isDeleting = false;
    this.reconcileToDelete = undefined;
  }

  confirmDeleteReconcile(): void {
    if (!this.reconcileToDelete?.id || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.cdr.detectChanges();

    this.inventoryService.deleteInventoryReconciliation(this.reconcileToDelete.id).subscribe({
      next: () => {
        this.toastr.success('Inventory reconcile deleted successfully.');
        this.closeDeleteModal();
        this.loadReconciliations();
      },
      error: () => {
        this.toastr.error('Unable to delete inventory reconcile.');
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }
}
