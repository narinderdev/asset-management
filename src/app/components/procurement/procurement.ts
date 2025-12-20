import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

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
  selectedStatus = 'ALL';
  statusOptions = ['ALL', 'Approved', 'Submitted', 'Pending Approval', 'Rejected', 'Draft'];
  isLoading = false;
  errorMessage?: string;

  constructor(
    private router: Router,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef
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

  private loadRequisitions(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.procurementService
      .fetchRequisitions(0, 20)
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
          this.filterRequests();
        },
        error: () => {
          this.errorMessage = 'Unable to load purchase requisitions. Please try again.';
          this.requests = [];
          this.filteredRequests = [];
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
      status: this.prettifyStatus(item.status)
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

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
