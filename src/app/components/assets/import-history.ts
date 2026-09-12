import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  AssetsService,
  ImportHistoryRow,
  ImportJobReportRow,
  ImportJobReportSummary
} from '../../services/assets.service';
import { CompanyContextService } from '../../services/company-context.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-history.html',
  styleUrl: './import-history.css'
})
export class ImportHistoryComponent implements OnInit {
  isLoading = false;
  rows: ImportHistoryRow[] = [];
  page = 0;
  size = 20;
  totalElements = 0;
  isViewModalOpen = false;
  isViewModalLoading = false;
  selectedSummary: ImportJobReportSummary | null = null;
  selectedRows: ImportJobReportRow[] = [];
  importType: 'ASSET' | 'INVENTORY' = 'ASSET';
  backRoute = '/assets';

  constructor(
    private readonly assetsService: AssetsService,
    private readonly companyContext: CompanyContextService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const queryType = String(this.route.snapshot.queryParamMap.get('importType') || 'ASSET').toUpperCase();
    this.importType = queryType === 'INVENTORY' ? 'INVENTORY' : 'ASSET';
    this.backRoute = this.route.snapshot.queryParamMap.get('backTo') || '/assets';
    this.loadHistory();
  }

  loadHistory(): void {
    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId === null) {
      this.toastr.error('No company selected. Please select a company and try again.');
      return;
    }

    this.isLoading = true;
    this.assetsService
      .fetchImportHistory({
        companyId,
        importType: this.importType,
        page: this.page,
        size: this.size
      })
      .pipe(
        finalize(() => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: response => {
          this.ngZone.run(() => {
            const data = response?.data ?? response ?? {};
            const content = data?.content ?? data?.items ?? data?.history ?? data;
            this.rows = Array.isArray(content) ? content : [];
            this.totalElements = Number(data?.totalElements ?? this.rows.length) || this.rows.length;
            this.page = Number(data?.page ?? data?.number ?? this.page) || 0;
            this.size = Number(data?.size ?? this.size) || this.size;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: err => {
          this.ngZone.run(() => {
            this.rows = [];
            this.totalElements = 0;
            this.isLoading = false;
            this.toastr.error(err?.error?.message || 'Unable to load import history.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  goBack(): void {
    this.router.navigateByUrl(this.backRoute);
  }

  viewImport(row: ImportHistoryRow): void {
    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId === null) {
      this.toastr.error('No company selected. Please select a company and try again.');
      return;
    }

    const jobId = Number(row.jobId ?? row.id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      this.toastr.error('Invalid job ID. Unable to fetch import report.');
      return;
    }

    this.isViewModalOpen = true;
    this.isViewModalLoading = true;
    this.selectedSummary = null;
    this.selectedRows = [];

    this.assetsService
      .fetchImportJobReport(jobId, companyId)
      .pipe(
        finalize(() => {
          this.ngZone.run(() => {
            this.isViewModalLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: response => {
          this.ngZone.run(() => {
            const responseAny = response as any;
            const data = responseAny?.data ?? responseAny?.body?.data ?? {};
            this.selectedSummary = data.summary ?? null;
            this.selectedRows = Array.isArray(data.rows) ? data.rows : [];
            this.isViewModalLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: err => {
          this.ngZone.run(() => {
            this.selectedSummary = null;
            this.selectedRows = [];
            this.isViewModalLoading = false;
            this.toastr.error(err?.error?.message || 'Unable to load import report.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  refreshHistory(): void {
    this.loadHistory();
    this.toastr.success('Import history refreshed.');
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
  }

  formatIssueMap(entries?: Array<Record<string, string>>): string {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '-';
    }

    return entries
      .map(item =>
        Object.entries(item)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      )
      .join(' | ');
  }

  formatApiDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const normalized = value.replace(/\.(\d{3})\d+/, '.$1');
    const dt = new Date(normalized);
    if (Number.isNaN(dt.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dt);
  }
}
