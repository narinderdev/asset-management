import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { InventoryAuditLogItem, InventoryAuditLogListResponse, InventoryService } from '../../services/inventory.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-inventory-audit-logs',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './inventory-audit-logs.html',
  styleUrls: ['./inventory-audit-logs.css']
})
export class InventoryAuditLogsComponent implements OnInit, OnDestroy {
  logs: InventoryAuditLogItem[] = [];
  isLoading = false;
  hasLoaded = false;
  errorMessage = '';
  currentPage = 0;
  itemsPerPage = 20;
  totalElements = 0;
  exportMenuOpen = false;
  skuSearch = '';
  private searchDebounceId?: ReturnType<typeof setTimeout>;

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = '';
    const sku = this.skuSearch.trim();

    this.getAuditLogRequest(sku, this.currentPage, this.itemsPerPage)
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
          this.errorMessage = sku ? 'Unable to search inventory audit logs.' : 'Unable to load inventory audit logs.';
        }
      });
  }

  onSkuInput(value: string): void {
    this.skuSearch = value;
    this.currentPage = 0;
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
    this.searchDebounceId = setTimeout(() => this.loadAuditLogs(), 300);
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

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
    this.cdr.detectChanges();
  }

  printReport(): void {
    this.exportMenuOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => window.print(), 0);
  }

  exportAs(type: 'pdf' | 'excel' | 'csv'): void {
    const headers = this.getExportHeaders();
    const rows = this.getExportRows();

    if (!rows.length) {
      this.exportMenuOpen = false;
      this.cdr.detectChanges();
      return;
    }

    if (type === 'excel') {
      const table = this.buildHtmlTable(headers, rows);
      this.downloadFile(table, 'inventory-audit-logs.xls', 'application/vnd.ms-excel');
    } else if (type === 'csv') {
      const csv = this.buildCsv(headers, rows);
      this.downloadFile(csv, 'inventory-audit-logs.csv', 'text/csv;charset=utf-8;');
    } else {
      this.buildStyledPdf('Inventory Audit Logs', headers, rows);
    }

    this.exportMenuOpen = false;
    this.cdr.detectChanges();
  }

  private getExportHeaders(): string[] {
    return [
      'ID',
      'Transaction Type',
      'Reference Type',
      'Reference Number',
      'Item ID',
      'SKU',
      'Item Name',
      'Before Qty',
      'After Qty',
      'Variance',
      'Performed By',
      'Reason'
    ];
  }

  private getExportRows(): string[][] {
    return this.logs.map(row => [
      String(row.id ?? '--'),
      this.formatEnumLabel(row.transactionType),
      this.formatEnumLabel(row.referenceType),
      row.referenceNumber || '--',
      row.itemId || '--',
      row.skuNumber || '--',
      row.itemName || '--',
      String(row.beforeQuantity ?? 0),
      String(row.afterQuantity ?? 0),
      String(row.varianceQuantity ?? 0),
      row.performedBy || '--',
      row.reason || '--'
    ]);
  }

  private downloadFile(data: string, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildHtmlTable(headers: string[], rows: string[][]): string {
    const textStyle = 'style="mso-number-format:\\@; white-space:nowrap;"';
    const title = `<tr><th colspan="${headers.length}" ${textStyle}>Inventory Audit Logs</th></tr>`;
    const thead = `<tr>${headers.map(h => `<th ${textStyle}>${h}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `<tr>${r.map(c => `<td ${textStyle}>${c}</td>`).join('')}</tr>`).join('');
    return `<table border="1"><thead>${title}${thead}</thead><tbody>${tbody}</tbody></table>`;
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const headerLine = headers.map(h => this.escapeCsvValue(h)).join(',');
    const rowLines = rows.map(row => row.map(cell => this.escapeCsvValue(cell)).join(','));
    return `\uFEFF${this.escapeCsvValue('Inventory Audit Logs')}\n${headerLine}\n${rowLines.join('\n')}`;
  }

  private escapeCsvValue(value: string): string {
    const safe = String(value ?? '');
    if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  }

  private buildStyledPdf(title: string, headers: string[], rows: string[][]): void {
    const doc = new jsPDF('l', 'pt');
    const margin = 32;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(title, margin, 25);

    doc.setFontSize(9);
    doc.text(this.formatGeneratedText(), pageWidth - margin, 25, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 56,
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [249, 250, 251], textColor: [55, 65, 81], lineWidth: 0.5, lineColor: [229, 231, 235] },
      bodyStyles: { lineWidth: 0.25, lineColor: [229, 231, 235] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    doc.save('inventory-audit-logs.pdf');
  }

  private formatGeneratedText(): string {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `Generated: ${datePart} at ${timePart}`;
  }

  private getAuditLogRequest(
    sku: string,
    page: number,
    size: number
  ): Observable<InventoryAuditLogListResponse> {
    if (sku) {
      return this.inventoryService.searchInventoryAuditLogs(sku, page, size);
    }
    return this.inventoryService.fetchInventoryAuditLogs(page, size);
  }
}
