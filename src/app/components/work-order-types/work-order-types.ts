import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderService, WorkOrderType } from '../../services/work-order.service';
import { Loader } from '../loader/loader';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { DeleteModalComponent } from '../delete-modal/delete-modal';

@Component({
  selector: 'app-work-order-types',
  standalone: true,
  imports: [CommonModule, RouterModule, Loader, DeleteModalComponent],
  templateUrl: './work-order-types.html',
  styleUrls: ['./work-order-types.css']
})
export class WorkOrderTypesComponent implements OnInit {
  types: WorkOrderType[] = [];
  isLoading = false;
  errorMessage?: string;
  showDeleteModal = false;
  deleting = false;
  deleteTarget?: WorkOrderType;

  page = 0;
  size = 10;
  total = 0;

  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
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

  viewType(type: WorkOrderType): void {
    if (!type?.id) return;
    this.router.navigate(['/work-orders/types/view', type.id]);
  }

  editType(type: WorkOrderType): void {
    if (!type?.id) return;
    this.router.navigate(['/work-orders/types/edit', type.id]);
  }

  deleteType(type: WorkOrderType): void {
    if (!type?.id) return;
    this.deleteTarget = type;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) {
      this.closeDeleteModal();
      return;
    }
    this.deleting = true;
    this.workOrderService.deleteWorkOrderType(this.deleteTarget.id).pipe(
      finalize(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.types = this.types.filter(t => t.id !== this.deleteTarget?.id);
        this.total = Math.max(0, this.total - 1);
        this.closeDeleteModal();
      },
      error: () => {
        this.errorMessage = 'Unable to delete work order type.';
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleting = false;
    this.deleteTarget = undefined;
    this.cdr.detectChanges();
  }
}
