import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ProcurementService,
  PurchaseRequisitionItem,
  PurchaseRequisitionLine,
  ConvertToPoPayload
} from '../../services/procurement.service';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { VendorService } from '../../services/vendor.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './view-procurement.html',
  styleUrls: ['./view-procurement.css']
})
export class ViewProcurementComponent implements OnInit {
  mrId: string | null;
  mrState: any;
  mrDetail?: PurchaseRequisitionItem;
  isLoading = true;
  isRejectModalOpen = false;
  rejectionReason = '';
  isRejecting = false;
  isApproving = false;
  isPoModalOpen = false;
  isCreatingPo = false;
  isLoadingVendors = false;
  hasLoadedVendors = false;
  vendorOptions: { id: number; name: string }[] = [];
  poForm = {
    vendorId: null as number | null,
    expectedDelivery: new Date().toISOString().split('T')[0],
    remarks: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private vendorService: VendorService
  ) {
    this.mrId = route.snapshot.paramMap.get('id');
    this.mrState = this.router.getCurrentNavigation()?.extras.state?.['mr'];
  }

  ngOnInit(): void {
    if (this.mrId) {
      this.fetchDetail(this.mrId);
    } else {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/procurement']);
  }

  approveMr(): void {
    if (!this.mrId || this.isApproved) {
      return;
    }
    this.isApproving = true;
    this.procurementService
      .approveMr(this.mrId, { approvedByUserId: 'current-user' })
      .pipe(
        finalize(() => {
          this.isApproving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('MR approved successfully');
          this.fetchDetail(this.mrId as string);
        },
        error: err => {
          console.error('Failed to approve MR', err);
          this.toastr.error('Failed to approve MR');
        }
      });
  }

  openReject(): void {
    if (this.isRejected) {
      return;
    }
    this.isRejectModalOpen = true;
  }

  closeReject(): void {
    this.isRejectModalOpen = false;
    this.rejectionReason = '';
    this.cdr.detectChanges();
  }

  submitReject(): void {
    if (!this.mrId) {
      return;
    }
    this.isRejecting = true;
    this.procurementService
      .rejectMr(this.mrId, {
        rejectedByUserId: 'current-user',
        reason: this.rejectionReason
      })
      .subscribe({
      next: () => {
        this.isRejecting = false;
        this.toastr.success('MR rejected successfully');
        this.closeReject();
        if (this.mrId) {
          this.fetchDetail(this.mrId);
        }
      },
      error: err => {
        console.error('Failed to reject MR', err);
        this.toastr.error('Failed to reject MR');
        this.isRejecting = false;
      }
    });
  }

  private fetchDetail(id: string): void {
    this.isLoading = true;
    this.procurementService
      .fetchMrById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.mrDetail = res.data;
        },
        error: err => {
          console.error('Failed to load MR detail', err);
        }
      });
  }

  get isRejected(): boolean {
    const status = this.mrDetail?.status || this.mrState?.status;
    return (status || '').toLowerCase() === 'rejected';
  }

  get isApproved(): boolean {
    const status = this.mrDetail?.status || this.mrState?.status;
    return (status || '').toLowerCase() === 'approved';
  }

  get isConvertedToPo(): boolean {
    const status = this.mrDetail?.status || this.mrState?.status;
    return (status || '').toLowerCase() === 'converted_to_po' || (status || '').toLowerCase() === 'converted to po';
  }

  formatStatus(status: string | undefined | null): string {
    if (!status) {
      return 'Submitted';
    }
    return status.replace(/_/g, ' ').trim();
  }

  formatDateOnly(value?: string | null): string {
    const raw = value?.trim();
    if (!raw || raw === '-') {
      return '-';
    }

    const datePrefix = /^\d{4}-\d{2}-\d{2}/.exec(raw)?.[0];
    if (datePrefix) {
      return datePrefix;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return parsed.toISOString().slice(0, 10);
  }

  convertToPo(): void {
    this.isPoModalOpen = true;
    if (!this.vendorOptions.length && !this.isLoadingVendors) {
      this.loadVendors();
    }
  }

  closePoModal(): void {
    this.isPoModalOpen = false;
    this.poForm = {
      vendorId: null,
      expectedDelivery: new Date().toISOString().split('T')[0],
      remarks: ''
    };
    this.cdr.detectChanges();
  }

  createPo(): void {
    if (!this.poForm.vendorId || !this.poForm.expectedDelivery) {
      this.toastr.warning('Please select a vendor and expected delivery date');
      return;
    }
    if (!this.mrId) {
      this.toastr.error('Missing MR id. Unable to create PO.');
      return;
    }

    const lines = (this.mrDetail?.lines || this.mrState?.lines || []).filter(
      (line: PurchaseRequisitionLine & { id?: number }) => line.id !== undefined
    );
    const payload: ConvertToPoPayload = {
      vendorId: Number(this.poForm.vendorId),
      createdByUserId: this.mrDetail?.requestedByUserId || 'current-user',
      expectedDeliveryDate: this.poForm.expectedDelivery,
      remarks: this.poForm.remarks,
      lineOverrides: lines.map(
        (line: PurchaseRequisitionLine & {
          id?: number;
          requestedQty?: number;
          qtyRequested?: number;
          quantity?: number;
          estimatedUnitPrice?: number;
          costPerUnit?: number;
          remarks?: string;
          description?: string;
        }) => ({
          mrLineId: Number(line.id),
          unitPrice: this.getUnitPrice(line),
          orderedQty:
          line.requestedQty ??
          line.qtyRequested ??
          line.quantity ??
          0,
          uom: line.uom || '',
          remarks: line.remarks || line.description || ''
        })
      )
    };

    if (!payload.lineOverrides.length) {
      this.toastr.error('No MR line items found to create a PO.');
      return;
    }

    this.isCreatingPo = true;
    this.procurementService
      .convertMrToPo(this.mrId, payload)
      .pipe(
        finalize(() => {
          this.isCreatingPo = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const poId =
            res?.data?.poId ??
            res?.data?.id ??
            res?.poId ??
            res?.id ??
            null;
          this.toastr.success('PO created successfully');
          this.closePoModal();
          if (poId) {
            this.router.navigate(['/procurement/purchase-orders'], {
              queryParams: { poId }
            });
          } else {
            this.router.navigate(['/procurement/purchase-orders']);
          }
        },
        error: err => {
          console.error('Failed to create PO', err);
          this.toastr.error('Unable to create PO. Please try again.');
        }
      });
  }

  private getUnitPrice(line: PurchaseRequisitionLine & { costPerUnit?: number; estimatedUnitPrice?: number }): number {
    const price = line.costPerUnit ?? line.estimatedUnitPrice;
    return price !== undefined && price !== null ? Number(price) : 0;
  }

  private loadVendors(): void {
    this.isLoadingVendors = true;
    this.hasLoadedVendors = false;
    this.vendorService
      .fetchVendors(0, 50)
      .pipe(
        finalize(() => {
          this.isLoadingVendors = false;
          this.hasLoadedVendors = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const vendors = res.data?.content ?? [];
          this.vendorOptions = vendors
            .map(vendor => ({
              id: this.parseVendorId(vendor),
              name: vendor.vendorName ?? vendor.vendorId ?? 'Unnamed vendor'
            }))
            .filter(vendor => !Number.isNaN(vendor.id));
        },
        error: err => {
          console.error('Failed to load vendors', err);
          this.vendorOptions = [];
          this.toastr.error('Unable to load vendors');
        }
      });
  }

  private parseVendorId(vendor: any): number {
    if (vendor === null || vendor === undefined) {
      return NaN;
    }

    const numericId =
      typeof vendor.id === 'number'
        ? vendor.id
        : vendor.id !== undefined
          ? Number(vendor.id)
          : NaN;

    if (!Number.isNaN(numericId)) {
      return numericId;
    }

    const cleanedVendorId =
      typeof vendor.vendorId === 'string'
        ? Number(vendor.vendorId.replace(/[^0-9.-]/g, ''))
        : Number(vendor.vendorId);

    return cleanedVendorId;
  }
}
