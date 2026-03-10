import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { VendorService } from '../../services/vendor.service';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

interface VendorDetail {
  id?: number;
  vendorId?: string;
  vendorName?: string;
  taxId?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  rating?: number;
  active?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-view-vendor',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-vendor.html',
  styleUrls: ['./view-vendor.css']
})
export class ViewVendorComponent implements OnInit {
  vendor?: VendorDetail;
  isLoading = true;
  errorMessage?: string;

  canEditVendors = false;
  isActionModalOpen = false;
  selectedAction: 'approve' | 'reject' | null = null;
  isSubmittingAction = false;
  rejectComment = '';
  rejectCommentTouched = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vendorService: VendorService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.canEditVendors = this.permissionService.hasPermission('VENDOR', 'UPDATE');

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.errorMessage = 'Missing vendor identifier.';
      this.isLoading = false;
      return;
    }

    const vendorId = Number(idParam);
    if (Number.isNaN(vendorId)) {
      this.errorMessage = 'Invalid vendor identifier.';
      this.isLoading = false;
      return;
    }

    this.vendorService
      .fetchVendorById(vendorId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          if (response.data) {
            this.vendor = response.data;
          } else {
            this.errorMessage = response.message ?? 'Vendor details not available.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load vendor details.';
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/vendor-management']);
  }

  formatDateString(value?: string): string {
    if (!value) {
      return '-';
    }
    return formatDate(value, 'medium', 'en-US');
  }

  formatPaymentTermsLabel(value?: string): string {
    if (!value) {
      return '-';
    }
    return value.replace(/_/g, ' ');
  }

  getStarRating(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return 'N/A';
    }
    const rating = Math.max(0, Math.min(5, Math.round(value)));
    return '*'.repeat(rating) + '-'.repeat(5 - rating);
  }

  maskTaxId(value?: string): string {
    const taxId = (value ?? '').trim();
    if (!taxId) {
      return '-';
    }
    if (taxId.length <= 4) {
      return taxId;
    }
    return `${'*'.repeat(taxId.length - 4)}${taxId.slice(-4)}`;
  }

  get isPendingApproval(): boolean {
    return (this.vendor?.status || '').trim().toUpperCase() === 'PENDING';
  }

  get canShowApprovalActions(): boolean {
    return Boolean(this.vendor?.id) && this.canEditVendors && this.isPendingApproval;
  }

  openActionModal(action: 'approve' | 'reject'): void {
    if (!this.canShowApprovalActions || this.isSubmittingAction) {
      return;
    }
    this.selectedAction = action;
    this.isActionModalOpen = true;
    this.rejectComment = '';
    this.rejectCommentTouched = false;
  }

  closeActionModal(): void {
    if (this.isSubmittingAction) {
      return;
    }
    this.isActionModalOpen = false;
    this.selectedAction = null;
    this.rejectComment = '';
    this.rejectCommentTouched = false;
  }

  confirmAction(): void {
    const vendorId = this.vendor?.id;
    if (!vendorId || !this.selectedAction || this.isSubmittingAction) {
      return;
    }

    const action = this.selectedAction;
    if (action === 'reject' && !this.rejectComment.trim()) {
      this.rejectCommentTouched = true;
      this.cdr.detectChanges();
      return;
    }

    const request$ = action === 'approve'
      ? this.vendorService.approveVendor(vendorId)
      : this.vendorService.rejectVendor(vendorId, this.rejectComment.trim());

    this.isSubmittingAction = true;
    request$.subscribe({
      next: () => {
        this.zone.run(() => {
          if (this.vendor) {
            this.vendor = {
              ...this.vendor,
              status: action === 'approve' ? 'APPROVED' : 'REJECTED'
            };
          }
          this.isSubmittingAction = false;
          this.isActionModalOpen = false;
          this.selectedAction = null;
          this.rejectComment = '';
          this.rejectCommentTouched = false;
          this.toastr.success(
            action === 'approve' ? 'Vendor approved successfully.' : 'Vendor rejected successfully.'
          );
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isSubmittingAction = false;
          this.toastr.error(
            action === 'approve'
              ? 'Unable to approve vendor. Please try again.'
              : 'Unable to reject vendor. Please try again.'
          );
          this.cdr.detectChanges();
        });
      }
    });
  }

  get actionTitle(): string {
    return this.selectedAction === 'approve' ? 'Approve Vendor' : 'Reject Vendor';
  }

  get actionMessage(): string {
    return this.selectedAction === 'approve'
      ? 'Are you sure you want to approve this vendor?'
      : 'Are you sure you want to reject this vendor?';
  }

  onRejectCommentChange(value: string): void {
    this.rejectComment = value;
    if (value.trim()) {
      this.rejectCommentTouched = false;
    }
  }
}
