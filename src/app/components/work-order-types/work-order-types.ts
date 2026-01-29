import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderService, WorkOrderType } from '../../services/work-order.service';
import { Loader } from '../loader/loader';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-work-order-types',
  standalone: true,
  imports: [CommonModule, RouterModule, Loader],
  templateUrl: './work-order-types.html',
  styleUrls: ['./work-order-types.css']
})
export class WorkOrderTypesComponent implements OnInit {
  types: WorkOrderType[] = [];
  isLoading = false;
  errorMessage?: string;

  page = 0;
  size = 10;
  total = 0;

  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTypes();
  }

  loadTypes(): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.workOrderService.fetchWorkOrderTypes(this.page, this.size).subscribe({
      next: res => {
        const data = res?.data;
        const content = Array.isArray(data?.content) ? data?.content : [];
        this.types = content;
        this.total = data?.totalElements ?? content.length;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.types = [];
        this.errorMessage = 'Unable to load work order types.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get displayStart(): number {
    if (!this.total) return 0;
    return this.page * this.size + 1;
  }

  get displayEnd(): number {
    if (!this.total) return 0;
    return Math.min((this.page + 1) * this.size, this.total);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.total || 0) / this.size));
  }

  nextPage(): void {
    if ((this.page + 1) < this.totalPages && !this.isLoading) {
      this.page += 1;
      this.loadTypes();
    }
  }

  previousPage(): void {
    if (this.page > 0 && !this.isLoading) {
      this.page -= 1;
      this.loadTypes();
    }
  }
}
