import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  item: string;
  qty: number;
  requiredBy: string;
  priority: 'Low' | 'Medium' | 'High' | 'Unknown';
  totalCost: string;
  status: string;
}

@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './procurement.html',
  styleUrls: ['./procurement.css']
})
export class ProcurementComponent implements OnInit {
  requests: ProcurementRequest[] = [];
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
        },
        error: () => {
          this.errorMessage = 'Unable to load purchase requisitions. Please try again.';
          this.requests = [];
          this.cdr.detectChanges();
        }
      });
  }

  private mapRequest(item: PurchaseRequisitionItem): ProcurementRequest {
    const line = item.lines?.[0];
    return {
      id: item.id ?? 0,
      prId: item.prId ?? `PR-${item.id ?? ''}`,
      requester: item.requester ?? '—',
      date: item.requestDate ?? '—',
      item: line?.itemName ?? line?.description ?? '—',
      qty: line?.qtyRequested ?? 0,
      requiredBy: item.requiredByDate ?? '—',
      priority: this.normalizePriority(item.priority),
      totalCost: this.formatCurrency(item.totalEstimatedCost),
      status: this.prettifyStatus(item.status)
    };
  }

  private normalizePriority(value?: string): ProcurementRequest['priority'] {
    if (!value) {
      return 'Unknown';
    }

    const normalized = value.toLowerCase();
    if (normalized.includes('high')) {
      return 'High';
    }
    if (normalized.includes('medium')) {
      return 'Medium';
    }
    if (normalized.includes('low')) {
      return 'Low';
    }

    return 'Unknown';
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

  private formatCurrency(value?: number): string {
    if (!value) {
      return '$0.00';
    }

    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}
