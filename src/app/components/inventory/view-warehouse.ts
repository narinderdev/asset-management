import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

import { InventoryService, WarehouseItem } from '../../services/inventory.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-warehouse',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-warehouse.html',
  styleUrls: ['./view-warehouse.css']
})
export class ViewWarehouseComponent implements OnInit {
  warehouseId?: number;
  warehouse?: WarehouseItem;
  isLoading = true;
  errorMessage?: string;
  readonly title = 'Warehouse Details';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.warehouseId = idParam ? Number(idParam) : undefined;
    if (!this.warehouseId) {
      this.errorMessage = 'Invalid warehouse id.';
      this.isLoading = false;
      return;
    }
    this.loadWarehouse(this.warehouseId);
  }

  private isAuthError(err: unknown): boolean {
    return err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);
  }

  private loadWarehouse(id: number): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.inventoryService
      .fetchWarehouseById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.warehouse = res.data ?? undefined;
          if (!this.warehouse) {
            this.errorMessage = 'Warehouse not found.';
          }
        },
        error: err => {
          if (!this.isAuthError(err)) {
            console.error('View warehouse error', err);
          }
          this.errorMessage = 'Unable to load warehouse. Please try again.';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  back(): void {
    this.router.navigate(['/inventory/warehouse']);
  }

  formatDate(value?: string | Date | null): string {
    if (!value) return '—';
    const d = typeof value === 'string' ? new Date(value) : value;
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
  }
}
