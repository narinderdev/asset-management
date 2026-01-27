import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

import {
  CreateWarehousePayload,
  InventoryService
} from '../../services/inventory.service';

@Component({
  selector: 'app-create-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-warehouse.html',
  styleUrls: ['./create-inventory.css']
})
export class CreateWarehouseComponent implements OnInit {
  form: CreateWarehousePayload = {
    name: '',
    address: '',
    zoneAisle: '',
    rackShelf: '',
    binCode: '',
    binDescription: '',
    active: true
  };

  isSubmitting = false;
  isLoading = false;
  isEdit = false;
  warehouseId?: number;
  errorMessage?: string;

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('id') ?? this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.warehouseId = Number(idParam);
      this.loadWarehouse(this.warehouseId);
    }
  }

  private loadWarehouse(id: number): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.inventoryService
      .fetchWarehouseById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: res => {
          const payload: any = (res as any)?.data?.data ?? res?.data ?? null;
          if (payload) {
            this.form = {
              name: payload.name ?? '',
              address: payload.address ?? '',
              zoneAisle: payload.zoneAisle ?? '',
              rackShelf: payload.rackShelf ?? '',
              binCode: payload.binCode ?? '',
              binDescription: payload.binDescription ?? '',
              active: payload.active ?? true
            };
            this.cdr.detectChanges();
          } else {
            this.errorMessage = 'Warehouse details not found.';
            this.toastr.error(this.errorMessage);
            this.cdr.detectChanges();
          }
        },
        error: err => {
          console.error('Load warehouse for edit failed', err);
          this.errorMessage = 'Unable to load warehouse details.';
          this.toastr.error(this.errorMessage);
          this.cdr.detectChanges();
        }
      });
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }
    if (this.isEdit && !this.warehouseId) {
      this.toastr.error('Missing warehouse id for update.');
      return;
    }
    this.errorMessage = undefined;
    this.isSubmitting = true;

    const request$ = this.isEdit && this.warehouseId
      ? this.inventoryService.updateWarehouse(this.warehouseId, this.form)
      : this.inventoryService.createWarehouse(this.form);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.isEdit ? 'Warehouse updated successfully' : 'Warehouse created successfully');
        this.router.navigate(['/inventory/warehouse']);
      },
      error: () => {
        this.errorMessage = this.isEdit
          ? 'Unable to update warehouse. Please try again.'
          : 'Unable to create warehouse. Please try again.';
        this.toastr.error(this.errorMessage);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.router.navigate(['/inventory/warehouse']);
  }
}
