import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { WorkOrderService, WorkOrderDetailResponse } from '../../services/work-order.service';

type WorkOrderDetail = NonNullable<WorkOrderDetailResponse['data']>;

@Component({
  standalone: true,
  selector: 'app-view-work-order',
  imports: [CommonModule],
  templateUrl: './view-work-order.html',
  styleUrls: ['./view-work-order.css']
})
export class ViewWorkOrderComponent implements OnInit {
  workOrder?: WorkOrderDetail;
  isLoading = false;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const workOrderId = this.route.snapshot.paramMap.get('id');
    if (!workOrderId) {
      this.errorMessage = 'Missing work order identifier.';
      return;
    }

    this.loadWorkOrder(workOrderId);
  }

  private loadWorkOrder(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.workOrderService
      .fetchWorkOrderById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          if (response.data) {
            this.workOrder = response.data;
          } else {
            this.errorMessage = response.message ?? 'Work order not found.';
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load work order details.';
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

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return '—';
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  goBack(): void {
    this.router.navigate(['/work-orders']);
  }
}
