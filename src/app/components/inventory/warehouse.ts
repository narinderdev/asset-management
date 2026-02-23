import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryService, WarehouseItem } from '../../services/inventory.service';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [CommonModule, DeleteModalComponent, Loader],
  templateUrl: './warehouse.html',
  styleUrls: ['./inventory.css']
})
export class WarehouseComponent implements OnInit {
  warehouses: WarehouseItem[] = [];
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  showEmptyState = false;
  isDeleting = false;
  deleteTargetId?: number;
  deleteTarget?: WarehouseItem;
  showDeleteModal = false;

  constructor(
    private inventoryService: InventoryService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
  }

  private isAuthError(err: unknown): boolean {
    return err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);
  }

  private loadWarehouses(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.warehouses = [];

    this.inventoryService
      .fetchWarehouses()
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: response => {
          this.zone.run(() => {
            try {
              const data = response?.data;
              const list = Array.isArray(data)
                ? data
                : Array.isArray((data as any)?.content)
                  ? (data as any).content
                  : [];

              this.errorMessage = undefined;
              this.warehouses = list;
              this.showEmptyState = this.warehouses.length === 0;
            } catch (err) {
              if (!this.isAuthError(err)) {
                console.error('Failed to map warehouses', err);
              }
              this.errorMessage = 'Unable to load warehouses. Please try again.';
              this.warehouses = [];
              this.showEmptyState = true;
            } finally {
              this.cdr.detectChanges();
            }
          });
        },
        error: (err) => {
          this.zone.run(() => {
            if (!this.isAuthError(err)) {
              console.error('Warehouse load error', err);
            }
            this.errorMessage = 'Unable to load warehouses. Please try again.';
            this.toastr.error(this.errorMessage);
            this.warehouses = [];
            this.showEmptyState = true;
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  createWarehouse(): void {
    this.router.navigate(['/inventory/warehouse/create']);
  }

  editWarehouse(item: WarehouseItem): void {
    if (!item.id) {
      this.toastr.info('No warehouse id available to edit.');
      return;
    }
    // Could navigate to an edit route when available
    this.router.navigate(['/inventory/warehouse/create'], { queryParams: { id: item.id } });
  }

  deleteWarehouse(item: WarehouseItem): void {
    if (this.isDeleting) return;
    if (!item.id) {
      this.toastr.info('No warehouse id available to delete.');
      return;
    }
    this.deleteTarget = item;
    this.deleteTargetId = item.id;
    this.showDeleteModal = true;
  }

  viewWarehouse(item: WarehouseItem): void {
    if (!item.id) {
      this.toastr.info('No warehouse id available to view.');
      return;
    }
    this.router.navigate(['/inventory/warehouse/view', item.id]);
  }

  onDeleteCancel(): void {
    this.showDeleteModal = false;
    this.isDeleting = false;
    this.deleteTargetId = undefined;
    this.deleteTarget = undefined;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId || this.isDeleting) return;
    this.isDeleting = true;

    this.inventoryService.deleteWarehouse(this.deleteTargetId).pipe(
      finalize(() => {
        this.zone.run(() => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.deleteTargetId = undefined;
          this.deleteTarget = undefined;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          this.toastr.success('Warehouse deleted successfully');
          this.loadWarehouses();
        });
      },
      error: err => {
        this.zone.run(() => {
          if (!this.isAuthError(err)) {
            console.error('Delete warehouse error', err);
          }
          this.toastr.error('Unable to delete warehouse. Please try again.');
        });
      }
    });
  }
}
