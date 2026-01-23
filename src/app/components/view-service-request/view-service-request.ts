import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ServiceRequestService, ServiceRequestDetailResponse } from '../../services/service-request.service';
import { ToastrService } from 'ngx-toastr';

type ServiceRequestDetail = NonNullable<ServiceRequestDetailResponse['data']>;

const VIEW_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  CONVERTED_TO_WO: 'Converted to WO',
  REJECTED: 'Rejected'
};

@Component({
  standalone: true,
  selector: 'app-view-service-request',
  imports: [CommonModule],
  templateUrl: './view-service-request.html',
  styleUrls: ['./view-service-request.css']
})
export class ViewServiceRequestComponent implements OnInit {
  request?: ServiceRequestDetail;

  isLoading = false;
  errorMessage?: string;
  requestLoaded = false;

  showAcceptModal = false;
  showRejectModal = false;
  isActionProcessing = false;

  approvedBy = 'System';
  rejectReason = 'Rejected via app';
  showConvertModal = false;

  private currentRequestId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceRequestService: ServiceRequestService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (!requestId) {
      this.request = undefined;
      this.isLoading = false;
      this.requestLoaded = true;
      this.errorMessage = 'Missing service request identifier.';
      this.cdr.detectChanges();
      return;
    }

    this.loadRequest(requestId);
  }

  private loadRequest(id: string): void {
    this.currentRequestId = id;

    // ✅ Reset loading flags for THIS fetch
    this.isLoading = true;
    this.requestLoaded = false;

    // ✅ Clear old error whenever we start loading
    this.errorMessage = undefined;

    // NOTE:
    // If you DON'T want old data to stay during refresh, uncomment next line:
    // this.request = undefined;

    this.serviceRequestService
      .fetchRequestById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.requestLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          // ✅ Always clear error on success callback
          this.errorMessage = undefined;

          if (response?.data) {
            this.request = response.data;
          } else {
            // No data case: show error only if nothing to display
            this.request = undefined;
            this.errorMessage = response?.message ?? 'Service request not found.';
          }

          this.cdr.detectChanges();
        },

        error: () => {
          /**
           * ✅ IMPORTANT FIX:
           * If request is already showing (data exists), DO NOT set errorMessage,
           * otherwise banner appears with data (your screenshot).
           * Just show a toast.
           */
          if (this.request) {
            this.toastr.error('Unable to refresh service request details.');
            this.errorMessage = undefined; // make 100% sure banner doesn't appear
          } else {
            this.request = undefined;
            this.errorMessage = 'Unable to load service request details. Please try again.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  formatDate(value?: string): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  formatStatus(value?: string): string {
    if (!value) return '-';
    const normalized = value.toUpperCase();
    return VIEW_STATUS_LABELS[normalized] ?? this.prettify(value);
  }

  private prettify(text?: string): string {
    if (!text) return '-';
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  isStatusNew(status?: string): boolean {
    return (status || '').toLowerCase() === 'new';
  }

  isStatusApproved(status?: string): boolean {
    return (status || '').toLowerCase() === 'approved';
  }

  onAccept(): void {
    this.showAcceptModal = true;
  }

  onReject(): void {
    this.showRejectModal = true;
  }

  onEdit(): void {
    if (!this.request) return;
    this.router.navigate(['/service-requests', this.request.id, 'edit']);
  }

  onConvert(): void {
    const id = this.request?.id || this.currentRequestId;
    if (!id || this.isActionProcessing) return;

    this.isActionProcessing = true;
    this.serviceRequestService
      .convertToWorkOrder(id)
      .pipe(
        finalize(() => {
          this.isActionProcessing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Service request converted to work order.');
          this.showConvertModal = false;
          this.router.navigate(['/service-requests']);
        },
        error: () => {
          this.toastr.error('Unable to convert service request. Please try again.');
        }
      });
  }

  closeModals(): void {
    this.showAcceptModal = false;
    this.showRejectModal = false;
    this.showConvertModal = false;
  }

  confirmAccept(): void {
    const id = this.request?.id || this.currentRequestId;
    if (!id) return;

    this.isActionProcessing = true;
    this.serviceRequestService
      .approveRequest(id, this.approvedBy)
      .pipe(
        finalize(() => {
          this.isActionProcessing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Service request approved.');
          if (this.request) {
            this.request = { ...this.request, status: 'APPROVED' };
          }
          this.closeModals();
          this.cdr.detectChanges();
        },
        error: () => {
          this.toastr.error('Failed to approve request. Please try again.');
        }
      });
  }

  confirmReject(): void {
    const id = this.request?.id || this.currentRequestId;
    if (!id) return;

    this.isActionProcessing = true;
    this.serviceRequestService
      .rejectRequest(id, this.rejectReason)
      .pipe(
        finalize(() => {
          this.isActionProcessing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Service request rejected.');
          if (this.request) {
            this.request = { ...this.request, status: 'REJECTED' };
          }
          this.closeModals();
          this.cdr.detectChanges();
        },
        error: () => {
          this.toastr.error('Failed to reject request. Please try again.');
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/service-requests']);
  }
}
