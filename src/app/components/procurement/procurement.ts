import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  ProcurementService,
  PurchaseRequisitionItem
} from '../../services/procurement.service';

interface ProcurementRequest {
  id: number;
  prId: string;
  requester: string;
  date: string;
  requiredBy: string;
  status: string;
  isLocked: boolean;
}

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procurement.html',
  styleUrls: ['./procurement.css']
})
export class ProcurementComponent implements OnInit {
  requests: ProcurementRequest[] = [];
  filteredRequests: ProcurementRequest[] = [];
  totalRequests = 0;
  currentPage = 0;
  itemsPerPage = 10;
  selectedStatus = 'ALL';
  statusOptions = ['ALL', 'Approved', 'Submitted', 'Pending Approval', 'Rejected', 'Draft'];
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;

  constructor(
    private router: Router,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadRequisitions();
  }

  createRequisition(): void {
    this.router.navigate(['/procurement/create']);
  }

  viewRequisition(request: ProcurementRequest): void {
    this.router.navigate(['/procurement/view', request.id], {
      state: { mr: request }
    });
  }

  editRequisition(request: ProcurementRequest): void {
    this.router.navigate(['/procurement/edit', request.id]);
  }

  private loadRequisitions(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.procurementService
      .fetchRequisitions(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.requests = content.map(item => this.mapRequest(item));
          this.totalRequests = response.data?.totalElements ?? this.requests.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          const apiPage = response.data?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.hasLoaded = true;
          this.filterRequests();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = undefined;
          this.requests = [];
          this.filteredRequests = [];
          this.totalRequests = 0;
          this.toastr.error('Unable to load purchase requisitions. Please try again.');
          this.hasLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  private mapRequest(item: PurchaseRequisitionItem): ProcurementRequest {
    return {
      id: item.id ?? 0,
      prId: item.mrNumber ?? `MR-${item.id ?? ''}`,
      requester: item.requestedByUserId ?? 'Unknown',
      date: item.updatedAt ?? item.createdAt ?? '',
      requiredBy: item.neededByDate ?? '',
      status: this.prettifyStatus(item.status),
      isLocked: this.isApprovedOrConverted(item.status)
    };
  }

  filterRequests(): void {
    if (this.selectedStatus === 'ALL') {
      this.filteredRequests = [...this.requests];
      return;
    }
    this.filteredRequests = this.requests.filter(
      req => req.status.toLowerCase() === this.selectedStatus.toLowerCase()
    );
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('convert')) {
      return 'status-converted';
    }
    if (normalized.includes('approve')) {
      return 'status-approved';
    }
    if (normalized.includes('submit')) {
      return 'status-submitted';
    }
    if (normalized.includes('reject')) {
      return 'status-rejected';
    }
    return 'status-neutral';
  }

  private prettifyStatus(value?: string): string {
    if (!value) {
      return 'Draft';
    }

    const normalized = value.toLowerCase();
    if (normalized.includes('convert')) {
      return 'Converted to PO';
    }

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private isApprovedOrConverted(status?: string): boolean {
    if (!status) {
      return false;
    }
    const normalized = status.toLowerCase();
    return normalized.includes('approved') || normalized.includes('converted');
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadRequisitions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadRequisitions();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRequests / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalRequests) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalRequests) {
      return 0;
    }
    const visibleCount = this.filteredRequests.length;
    return Math.min(this.currentPage * this.itemsPerPage + visibleCount, this.totalRequests);
  }
}
