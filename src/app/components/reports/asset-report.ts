import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { AssetsService, AssetTypesApiResponse, AssetReportPage } from '../../services/assets.service';
import { Loader } from '../loader/loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PermissionService } from '../../services/permission.service';

interface ReportRow {
  assetId: string;
  assetName: string;
  location: string;
  status: string;
  statusLabel: string;
  warrantyEnd: string;
  criticality: string;
  assetType: string;
}

@Component({
  selector: 'app-asset-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './asset-report.html',
  styleUrls: ['./report.css']
})
export class AssetReportComponent implements OnInit {
  heading = 'Asset Report';
  totalSummary = 0;

  filterStatusText = '';
  filterWarrantyDays = '';
  filterCriticality = '';
  filterAssetTypeId = '';

  statusOptions = [
    { value: 'IN_SERVICE', label: 'In Service' },
    { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
    { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
    { value: 'DISPOSED', label: 'Disposed' }
  ];
  warrantyDayOptions = ['30', '60', '90'];
  criticalityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  assetTypeOptions: Array<{ id: number; label: string }> = [];

  rows: ReportRow[] = [];

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  isLoading = false;
  exportMenuOpen = false;
  canExportReports = false;

  constructor(
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.canExportReports = this.permissionService.hasPermission('REPORTS', 'EXPORT');
    this.loadAssetTypes();
    this.loadReport();
  }

  private loadAssetTypes(): void {
    this.assetsService.fetchAssetTypes().subscribe({
      next: (res: AssetTypesApiResponse) => {
        const raw = res.data;
        const types = Array.isArray(raw) ? raw : (raw as any)?.content ?? [];
        this.assetTypeOptions = (types as any[])
          .filter(t => t?.id !== undefined)
          .map(t => ({
            id: Number(t.id),
            label: t.name ?? t.assetTypeName ?? t.typeName ?? `Type #${t.id}`
          }));
      },
      error: () => {
        this.assetTypeOptions = [];
      }
    });
  }

  onFilterChange(): void {
    this.page = 0;
    this.loadReport();
  }

  onPageChange(delta: number): void {
    const next = this.page + delta;
    if (next < 0 || (this.totalPages && next >= this.totalPages)) {
      return;
    }
    this.page = next;
    this.loadReport();
  }

  private loadReport(): void {
    this.isLoading = true;
    this.assetsService
      .fetchAssetReports({
        page: this.page,
        size: this.size,
        status: this.filterStatusText,
        warrantyExpiryDays: this.filterWarrantyDays,
        criticality: this.filterCriticality,
        assetTypeId: this.filterAssetTypeId
      })
      .subscribe({
        next: res => {
          const data: AssetReportPage | undefined = res.data;
          this.totalElements = data?.totalElements ?? 0;
          this.totalPages = Math.max(1, data?.totalPages ?? 1);
          this.size = data?.size ?? this.size;
          // keep page in range if backend shrank total pages
          if (this.page >= this.totalPages) {
            this.page = this.totalPages - 1;
          }
          const content = data?.content ?? [];
          this.rows = content.map((item: any) => ({
            assetId: item.assetId ?? `Asset #${item.id ?? ''}`,
            assetName: item.assetName ?? '-',
            location: item.location?.location ?? item.location ?? '-',
            status: item.status ?? '-',
            statusLabel: this.formatStatus(item.status ?? '-'),
            warrantyEnd: item.warrantyLifecycle?.warrantyEnd ?? '-',
            criticality: item.criticality ?? '-',
            assetType: item.assetType ?? item.assetTypeCode ?? item.assetTypeId ?? '-'
          }));
          this.totalSummary = 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.rows = [];
          this.totalSummary = 0;
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.detectChanges();
        }
      })
      .add(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  formatCurrency(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  get rangeStart(): number {
    return this.totalElements > 0 ? this.page * this.size + 1 : 0;
    }

  get rangeEnd(): number {
    return this.totalElements > 0 ? Math.min((this.page + 1) * this.size, this.totalElements) : 0;
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  toggleExportMenu(): void {
    if (!this.canExportReports) {
      return;
    }
    this.exportMenuOpen = !this.exportMenuOpen;
    this.cdr.detectChanges();
  }

  closeExportMenu(): void {
    this.exportMenuOpen = false;
    this.cdr.detectChanges();
  }

  printReport(): void {
    this.exportMenuOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => window.print(), 0);
  }

  exportAs(type: 'pdf' | 'excel' | 'csv'): void {
    if (!this.canExportReports) {
      return;
    }
    const headers = ['Asset ID', 'Asset Name', 'Location', 'Status', 'Warranty Expired Date', 'Criticality', 'Asset Type'];
    const rows = this.rows.map(r => [
      r.assetId,
      r.assetName,
      r.location,
      r.statusLabel,
      r.warrantyEnd,
      r.criticality,
      r.assetType
    ]);

    if (type === 'excel') {
      const table = this.buildHtmlTable(headers, rows);
      this.downloadFile(table, 'asset-report.xls', 'application/vnd.ms-excel');
    } else if (type === 'csv') {
      const csv = this.buildCsv(headers, rows);
      this.downloadFile(csv, 'asset-report.csv', 'text/csv;charset=utf-8;');
    } else {
      this.buildStyledPdf('Asset Report', headers, rows);
    }
    this.exportMenuOpen = false;
    this.cdr.detectChanges();
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
    const thead = `<tr>${headers.map(h => `<th ${textStyle}>${h}</th>`).join('')}</tr>`;
    const tbody = rows
      .map(r => `<tr>${r.map(c => `<td ${textStyle}>${c}</td>`).join('')}</tr>`)
      .join('');
    return `<table border="1"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const allRows = [headers, ...rows];
    return `\uFEFF${allRows.map(row => row.map(cell => this.escapeCsvValue(cell)).join(',')).join('\n')}`;
  }

  private escapeCsvValue(value: string): string {
    const safe = String(value ?? '');
    if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  }

  private buildSimplePdf(title: string, headers: string[], rows: string[][]): string {
    const lines = [title, '', headers.join(' | '), ...rows.map(r => r.join(' | '))];
    const streamText = lines
      .map((line, idx) => `0 -${16 * idx} Td (${this.escapePdfText(line)}) Tj`)
      .join('\n');
    const content = `BT /F1 12 Tf 50 780 Td\n${streamText}\nET`;
    const contentLength = content.length;
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${contentLength} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000274 00000 n 
0000000455 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
535
%%EOF`;
    return pdf;
  }

  private buildTextTablePdf(title: string, headers: string[], rows: string[][]): string {
    const cols = headers.length;
    const widths = new Array(cols).fill(0);
    headers.forEach((h, i) => (widths[i] = Math.max(widths[i], h.length)));
    rows.forEach(r => r.forEach((v, i) => (widths[i] = Math.max(widths[i], String(v).length))));

    const padRow = (cells: string[]) =>
      cells
        .map((c, i) => String(c).padEnd(widths[i] + 2, ' '))
        .join('');

    const lines = [
      title,
      padRow(headers),
      ...rows.map(r => padRow(r))
    ];

    const lineHeight = 14;
    const startY = 800;
    const streamText = lines
      .map((line, idx) => `0 -${lineHeight * idx} Td (${this.escapePdfText(line)}) Tj`)
      .join('\n');
    const content = `BT /F1 10 Tf 40 ${startY} Td\n${streamText}\nET`;
    const contentLength = content.length;
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${contentLength} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000274 00000 n 
0000000455 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
535
%%EOF`;
    return pdf;
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private buildStyledPdf(title: string, headers: string[], rows: string[][]): void {
    const doc = new jsPDF('p', 'pt');
    const margin = 32;

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(title, margin, 25);
    const dateText = this.formatGeneratedText();
    doc.setFontSize(9);
    doc.text(dateText, doc.internal.pageSize.getWidth() - margin, 25, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const filterLines = [
      `Status: ${this.formatStatus(this.filterStatusText) || 'All'}`,
      `Warranty Days: ${this.filterWarrantyDays || 'All'}`,
      `Criticality: ${this.filterCriticality || 'All'}`,
      `Asset Type: ${this.filterAssetTypeId || 'All'}`
    ];
    doc.setFontSize(9);
    doc.text(filterLines.join('   |   '), margin, 60);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 75,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [249, 250, 251], textColor: [55, 65, 81], lineWidth: 0.5, lineColor: [229, 231, 235] },
      bodyStyles: { lineWidth: 0.25, lineColor: [229, 231, 235] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: 'grid',
      margin: { left: margin, right: margin }
    });

    doc.save('asset-report.pdf');
  }

  private formatGeneratedText(): string {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `Generated: ${datePart} at ${timePart}`;
  }
}
