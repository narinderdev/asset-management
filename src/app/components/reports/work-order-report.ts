import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetsService, WorkOrderReportPage } from '../../services/assets.service';
import { Loader } from '../loader/loader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PermissionService } from '../../services/permission.service';

interface ReportRow {
  woId: string;
  title: string;
  asset: string;
  technicianTeam: string;
  technicianTeamBadge: string;
  priority: string;
  status: string;
  statusLabel: string;
}

@Component({
  selector: 'app-work-order-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './work-order-report.html',
  styleUrls: ['./report.css']
})
export class WorkOrderReportComponent implements OnInit {
  heading = 'Work Order Report';
  totalSummary = 0;

  filterStatus = '';
  statuses = [
    { value: '', label: 'Status' },
    { value: 'NEW', label: 'New' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CLOSED', label: 'Closed' }
  ];

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
    this.loadReport();
  }

  onFilterChange(): void {
    this.page = 0;
    this.loadReport();
  }

  onPageChange(delta: number): void {
    const next = this.page + delta;
    if (next < 0 || (this.totalPages && next >= this.totalPages)) return;
    this.page = next;
    this.loadReport();
  }

  private loadReport(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.assetsService
      .fetchWorkOrderReports({
        page: this.page,
        size: this.size,
        status: this.filterStatus
      })
      .subscribe({
        next: res => {
          const data: WorkOrderReportPage | undefined = res.data;
          const list = data?.workOrders ?? [];
          this.totalElements = data?.totalElements ?? list.length;
          this.totalPages = Math.max(1, data?.totalPages ?? 1);
          this.size = data?.size ?? this.size;
          if (this.page >= this.totalPages) {
            this.page = Math.max(0, this.totalPages - 1);
          }
          this.rows = list.map((w: any) => ({
            woId: w.workOrderId ?? w.workOrderNumber ?? `WO-${w.id ?? ''}`,
            title: w.woTitle ?? w.descriptionScope ?? '-',
            asset: w.assetName ?? w.assetId ?? '-',
            technicianTeam: w.assignedTeamName ?? w.assignedTechnicianName ?? '-',
            technicianTeamBadge: w.assignedTeamName
              ? 'Team'
              : w.assignedTechnicianName
              ? 'Technician'
              : '',
            priority: this.formatLabel(w.priority ?? '-'),
            status: w.status ?? '-',
            statusLabel: this.formatLabel(w.status ?? '-')
          }));
          this.totalSummary = 0;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.rows = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.totalSummary = 0;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get rangeStart(): number {
    return this.totalElements > 0 ? this.page * this.size + 1 : 0;
  }

  get rangeEnd(): number {
    return this.totalElements > 0 ? Math.min((this.page + 1) * this.size, this.totalElements) : 0;
  }

  private formatLabel(value: string): string {
    if (!value) {
      return '-';
    }
    const normalized = String(value).replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
    const headers = ['WO ID', 'Title', 'Asset', 'Technician/Team', 'Priority', 'Status'];
    const rows = this.rows.map(r => [
      r.woId,
      r.title,
      r.asset,
      r.technicianTeam,
      r.priority,
      r.statusLabel
    ]);

    if (type === 'excel') {
      const table = this.buildHtmlTable(headers, rows);
      this.downloadFile(table, 'work-order-report.xls', 'application/vnd.ms-excel');
    } else if (type === 'csv') {
      const csv = this.buildCsv(headers, rows);
      this.downloadFile(csv, 'work-order-report.csv', 'text/csv;charset=utf-8;');
    } else {
      this.buildStyledPdf('Work Order Report', headers, rows);
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

    const filterLine = `Status: ${this.formatLabel(this.filterStatus || 'All')}`;
    doc.setFontSize(9);
    doc.text(filterLine, margin, 60);

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

    doc.save('work-order-report.pdf');
  }

  private formatGeneratedText(): string {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `Generated: ${datePart} at ${timePart}`;
  }
}
