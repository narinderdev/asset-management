import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ServiceRequestService, ServiceRequestDetailResponse } from '../../services/service-request.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceRequestService: ServiceRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (!requestId) {
      this.errorMessage = 'Missing service request identifier.';
      return;
    }

    this.loadRequest(requestId);
  }

  private loadRequest(id: string): void {
    this.isLoading = true;
    this.requestLoaded = false;
    this.errorMessage = undefined;

    this.serviceRequestService
      .fetchRequestById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        if (!this.requestLoaded) {
          this.requestLoaded = true;
          this.cdr.detectChanges();
        }
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            this.request = response.data;
          } else {
            this.errorMessage = response.message ?? 'Service request not found.';
          }
          this.requestLoaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load service request details. Please try again.';
          this.requestLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  formatStatus(value?: string): string {
    if (!value) {
      return '—';
    }
    const normalized = value.toUpperCase();
    return VIEW_STATUS_LABELS[normalized] ?? this.prettify(value);
  }

  private prettify(text?: string): string {
    if (!text) {
      return '—';
    }
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  goBack(): void {
    this.router.navigate(['/service-requests']);
  }
}
