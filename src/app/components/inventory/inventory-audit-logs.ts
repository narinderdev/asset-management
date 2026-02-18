import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { InventoryAuditLogItem, InventoryService } from '../../services/inventory.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-inventory-audit-logs',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './inventory-audit-logs.html',
  styleUrls: ['./inventory-audit-logs.css']
})
export class InventoryAuditLogsComponent implements OnInit {
  logs: InventoryAuditLogItem[] = [];
  isLoading = false;
  hasLoaded = false;
  errorMessage = '';
  currentPage = 0;
  itemsPerPage = 10;
  totalElements = 0;

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = '';

    this.inventoryService
      .fetchInventoryAuditLogs(this.currentPage, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          try {
            const payload: any = response?.data ?? {};
            const content: InventoryAuditLogItem[] =
              (Array.isArray(payload?.content) ? payload.content : undefined) ??
              (Array.isArray(payload) ? payload : undefined) ??
              (Array.isArray((response as any)?.content) ? (response as any).content : []);

            this.logs = [...content];
            this.totalElements = Number(payload?.totalElements ?? (response as any)?.totalElements ?? this.logs.length);
            this.currentPage = Number(payload?.number ?? (response as any)?.number ?? this.currentPage);
            this.errorMessage = '';
          } catch {
            this.logs = [];
            this.totalElements = 0;
            this.errorMessage = 'Unable to parse inventory audit logs response.';
          }
        },
        error: () => {
          this.logs = [];
          this.totalElements = 0;
          this.errorMessage = 'Unable to load inventory audit logs.';
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadAuditLogs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadAuditLogs();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalElements) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalElements) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalElements);
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatEnumLabel(value?: string): string {
    if (!value) {
      return '--';
    }
    return value.replace(/_/g, ' ');
  }
}
