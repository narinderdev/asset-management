import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  InventoryReconciliationActionPayload,
  InventoryReconciliationItem,
  InventoryService
} from '../../services/inventory.service';
import { Loader } from '../loader/loader';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-view-inventory-reconcile',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './view-inventory-reconcile.html',
  styleUrls: ['./view-inventory-reconcile.css']
})
export class ViewInventoryReconcileComponent implements OnInit {
  reconcileItem?: InventoryReconciliationItem;
  isLoading = true;
  errorMessage?: string;
  isActionModalOpen = false;
  actionType: 'approve' | 'reject' | null = null;
  actionComment = '';
  isSubmittingAction = false;
  private reconcileId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    if (!id) {
      this.errorMessage = 'Invalid inventory reconcile id.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    this.reconcileId = id;
    this.loadReconcileItem(id);
  }

  private loadReconcileItem(id: number): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.cdr.detectChanges();

    this.inventoryService
      .fetchInventoryReconciliationById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.reconcileItem = res.data ?? undefined;
          if (!this.reconcileItem) {
            this.errorMessage = res.message || 'Inventory reconcile not found.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.reconcileItem = undefined;
          this.errorMessage = 'Unable to load inventory reconcile.';
          this.cdr.detectChanges();
        }
      });
  }

  back(): void {
    this.router.navigate(['/inventory/reconcile']);
  }

  get normalizedStatus(): string {
    return (this.reconcileItem?.status || '').trim().toUpperCase();
  }

  get canTakeAction(): boolean {
    return this.normalizedStatus === 'SUBMITTED';
  }

  openActionModal(type: 'approve' | 'reject'): void {
    if (!this.canTakeAction || this.isSubmittingAction) {
      return;
    }
    this.actionType = type;
    this.actionComment = '';
    this.isActionModalOpen = true;
    this.cdr.detectChanges();
  }

  closeActionModal(): void {
    if (this.isSubmittingAction) {
      return;
    }
    this.isActionModalOpen = false;
    this.actionType = null;
    this.actionComment = '';
    this.cdr.detectChanges();
  }

  submitAction(): void {
    if (!this.actionType || !this.reconcileId || this.isSubmittingAction) {
      return;
    }

    const comment = this.actionComment.trim();
    if (!comment) {
      this.toastr.error('Comment is required.');
      return;
    }

    const payload: InventoryReconciliationActionPayload = {
      actor: this.permissionService.getCurrentUserName() || 'system',
      comment
    };

    this.isSubmittingAction = true;
    this.cdr.detectChanges();

    const request$ = this.actionType === 'approve'
      ? this.inventoryService.approveInventoryReconciliation(this.reconcileId, payload)
      : this.inventoryService.rejectInventoryReconciliation(this.reconcileId, payload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmittingAction = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const completedAction = this.actionType;
          this.isActionModalOpen = false;
          this.actionType = null;
          this.actionComment = '';
          this.isSubmittingAction = false;
          this.cdr.detectChanges();

          this.toastr.success(
            completedAction === 'approve'
              ? 'Inventory reconciliation approved successfully.'
              : 'Inventory reconciliation rejected successfully.'
          );
          this.loadReconcileItem(this.reconcileId);
        },
        error: () => {
          this.toastr.error(
            this.actionType === 'approve'
              ? 'Unable to approve inventory reconciliation.'
              : 'Unable to reject inventory reconciliation.'
          );
        }
      });
  }

  get actionModalTitle(): string {
    return this.actionType === 'approve' ? 'Approve Inventory Reconcile' : 'Reject Inventory Reconcile';
  }

  get actionModalButtonText(): string {
    if (this.isSubmittingAction) {
      return this.actionType === 'approve' ? 'Approving...' : 'Rejecting...';
    }
    return this.actionType === 'approve' ? 'Approve' : 'Reject';
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

  formatDateTime(value?: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
