import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Loader } from '../../components/loader/loader';
import {
  RoleService,
  SecurityReportByRoleResponse
} from '../../services/role.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

type ViewMode = 'ROLE' | 'OBJECT';

interface RolePermissionRow {
  roleName: string;
  objectName: string;
  permissions: string[];
}

@Component({
  selector: 'app-security-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-report.html',
  styleUrl: './security-report.css'
})
export class SecurityReportComponent {
  readonly math = Math;
  readonly pageSize = 10;
  readonly viewMode = signal<ViewMode>('ROLE');
  readonly selectedRole = signal('');
  readonly selectedObject = signal('');
  readonly currentPage = signal(0);
  readonly loading = signal(false);
  readonly showExportMenu = signal(false);
  readonly roleRows = signal<RolePermissionRow[]>([]);
  readonly objectRows = signal<RolePermissionRow[]>([]);
  readonly pendingRequests = signal(0);
  readonly permissionPriority = ['VIEW', 'CREATE', 'UPDATE', 'EDIT', 'DELETE', 'APPROVE', 'APPLY', 'SEND', 'INVITE_USER'];

  readonly roleOptions = computed(() => {
    const source = this.viewMode() === 'ROLE' ? this.roleRows() : this.objectRows();
    return Array.from(new Set(source.map(row => row.roleName).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  });

  readonly objectOptions = computed(() => {
    const source = this.viewMode() === 'ROLE' ? this.roleRows() : this.objectRows();
    return Array.from(new Set(source.map(row => row.objectName).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  });

  readonly primaryHeader = computed(() => (this.viewMode() === 'ROLE' ? 'Role' : 'Object'));
  readonly secondaryHeader = computed(() => (this.viewMode() === 'ROLE' ? 'Object' : 'Role'));

  readonly filteredRows = computed(() => {
    const source = this.viewMode() === 'ROLE' ? this.roleRows() : this.objectRows();
    const selectedRole = this.selectedRole();
    const selectedObject = this.selectedObject();
    return source.filter(row => {
      if (selectedRole && row.roleName !== selectedRole) {
        return false;
      }
      if (selectedObject && row.objectName !== selectedObject) {
        return false;
      }
      return true;
    });
  });

  readonly permissionColumns = computed(() => {
    const perms = new Set<string>();
    for (const row of this.filteredRows()) {
      for (const permission of row.permissions) {
        perms.add(this.normalizePermission(permission));
      }
    }

    const priorityMap = new Map(this.permissionPriority.map((perm, idx) => [this.normalizePermission(perm), idx]));
    return Array.from(perms).sort((a, b) => {
      const ai = priorityMap.get(a);
      const bi = priorityMap.get(b);
      if (ai !== undefined && bi !== undefined) {
        return ai - bi;
      }
      if (ai !== undefined) {
        return -1;
      }
      if (bi !== undefined) {
        return 1;
      }
      return a.localeCompare(b);
    });
  });

  readonly tableHeaders = computed(() => [
    this.primaryHeader(),
    this.secondaryHeader(),
    ...this.permissionColumns()
  ]);

  readonly totalPages = computed(() => {
    const total = this.filteredRows().length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize);
  });

  readonly paginatedRows = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  constructor(private roleService: RoleService) {
    this.fetchRoleDataset();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showExportMenu.set(false);
  }

  switchView(mode: ViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
    this.currentPage.set(0);
    if (mode === 'ROLE') {
      this.selectedObject.set('');
      this.ensureSelection();
      return;
    }
    this.selectedRole.set('');
    this.ensureSelection();
  }

  onRoleChange(value: string): void {
    this.selectedRole.set(value);
    this.currentPage.set(0);
  }

  onObjectChange(value: string): void {
    this.selectedObject.set(value);
    this.currentPage.set(0);
  }

  toggleExportMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showExportMenu.set(!this.showExportMenu());
  }

  onExportMenuClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  printReport(): void {
    this.showExportMenu.set(false);
    window.print();
  }

  exportAsCsv(): void {
    const rows = this.getExportRows();
    if (!rows.length) {
      alert('No rows to export.');
      return;
    }

    const headers = this.tableHeaders();
    const csvRows = [headers, ...rows].map(row => row.map(cell => this.escapeCsv(cell)).join(',')).join('\n');
    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, this.buildFileName('csv'));
    this.showExportMenu.set(false);
  }

  exportAsExcel(): void {
    const rows = this.getExportRows();
    if (!rows.length) {
      alert('No rows to export.');
      return;
    }

    const aoa = [this.tableHeaders(), ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = this.tableHeaders().map((_, idx) => {
      if (idx === 0) {
        return { wch: 25 };
      }
      if (idx === 1) {
        return { wch: 25 };
      }
      return { wch: 12 };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Report');
    XLSX.writeFile(workbook, this.buildFileName('xlsx'));
    this.showExportMenu.set(false);
  }

  exportAsPdf(): void {
    const rows = this.getExportRows();
    if (!rows.length) {
      alert('No rows to export.');
      return;
    }

    const permissionCount = this.permissionColumns().length;
    const orientation = permissionCount <= 5 ? 'p' : 'l';
    const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 32;
    const headerHeight = 34;
    const rowHeight = 30;
    const headers = this.tableHeaders();
    const firstColWidth = 170;
    const secondColWidth = 170;
    const remainingWidth = pageWidth - (margin * 2) - firstColWidth - secondColWidth;
    const permissionWidth = permissionCount ? Math.max(56, remainingWidth / permissionCount) : 0;
    const widths = [firstColWidth, secondColWidth, ...Array(permissionCount).fill(permissionWidth)];

    let y = margin;
    const drawHeader = () => {
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, y, widths.reduce((sum, width) => sum + width, 0), headerHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);

      let x = margin;
      headers.forEach((header, idx) => {
        const cellWidth = widths[idx];
        const text = idx <= 1 ? header : this.formatLabel(header);
        if (idx <= 1) {
          pdf.text(text, x + 8, y + 21);
        } else {
          pdf.text(text, x + (cellWidth / 2), y + 21, { align: 'center' });
        }
        x += cellWidth;
      });
      y += headerHeight;
    };

    drawHeader();
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(17, 24, 39);

    rows.forEach((row, rowIndex) => {
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        drawHeader();
      }

      pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 249, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 251);
      pdf.rect(margin, y, widths.reduce((sum, width) => sum + width, 0), rowHeight, 'F');

      let x = margin;
      row.forEach((value, idx) => {
        const cellWidth = widths[idx];
        if (idx <= 1) {
          pdf.text(String(value), x + 8, y + 19);
        } else {
          pdf.text(String(value), x + (cellWidth / 2), y + 19, { align: 'center' });
        }
        x += cellWidth;
      });
      y += rowHeight;
    });

    pdf.save(this.buildFileName('pdf'));
    this.showExportMenu.set(false);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }
    if (current <= 3) {
      return [0, 1, 2, 3, 4, -1, total - 1];
    }
    if (current >= total - 4) {
      return [0, -1, total - 5, total - 4, total - 3, total - 2, total - 1];
    }
    return [0, -1, current - 1, current, current + 1, -1, total - 1];
  }

  getStartEntry(): number {
    const total = this.filteredRows().length;
    if (!total) {
      return 0;
    }
    return this.currentPage() * this.pageSize + 1;
  }

  getEndEntry(): number {
    const total = this.filteredRows().length;
    if (!total) {
      return 0;
    }
    return Math.min((this.currentPage() + 1) * this.pageSize, total);
  }

  hasPermission(row: RolePermissionRow, permission: string): boolean {
    return row.permissions.includes(permission);
  }

  getPrimaryValue(row: RolePermissionRow): string {
    return this.viewMode() === 'ROLE' ? this.formatLabel(row.roleName) : this.formatLabel(row.objectName);
  }

  getSecondaryValue(row: RolePermissionRow): string {
    return this.viewMode() === 'ROLE' ? this.formatLabel(row.objectName) : this.formatLabel(row.roleName);
  }

  getActiveCompanyCode(): string | null {
    const raw = localStorage.getItem('companyCode')?.trim();
    return raw || null;
  }

  normalizePermission(permission: string): string {
    const normalized = (permission || '').trim().toUpperCase();
    if (normalized === 'EDIT') {
      return 'UPDATE';
    }
    return normalized;
  }

  formatLabel(value: string): string {
    if (!value) {
      return '';
    }
    return value
      .replace(/[_\s]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => {
        const upperPart = part.toUpperCase();
        if (upperPart.length <= 2) {
          return upperPart;
        }
        return upperPart.charAt(0) + upperPart.slice(1).toLowerCase();
      })
      .join(' ');
  }

  private fetchRoleDataset(): void {
    this.beginRequest();
    this.roleService
      .getSecurityReportByRole()
      .pipe(finalize(() => this.endRequest()))
      .subscribe({
        next: response => {
          const normalizedRows = this.flattenRoleResponse(response);
          this.roleRows.set(normalizedRows);
          this.objectRows.set(normalizedRows);
          this.ensureSelection();
        },
        error: () => {
          this.roleRows.set([]);
          this.objectRows.set([]);
          this.ensureSelection();
        }
      });
  }

  private ensureSelection(): void {
    const roleSet = new Set(this.roleOptions());
    const objectSet = new Set(this.objectOptions());

    if (this.selectedRole() && !roleSet.has(this.selectedRole())) {
      this.selectedRole.set('');
    }
    if (this.selectedObject() && !objectSet.has(this.selectedObject())) {
      this.selectedObject.set('');
    }
    this.currentPage.set(0);
  }

  private flattenRoleResponse(response: SecurityReportByRoleResponse): RolePermissionRow[] {
    const items = response?.data ?? [];
    const rows: RolePermissionRow[] = [];
    items.forEach(item => {
      const roleName = item.role || '';
      const objects = item.objects || {};
      Object.entries(objects).forEach(([objectName, permissions]) => {
        rows.push({
          roleName,
          objectName,
          permissions: (permissions || []).map(permission => this.normalizePermission(permission))
        });
      });
    });
    return rows;
  }

  private beginRequest(): void {
    this.pendingRequests.update(count => count + 1);
    this.loading.set(true);
  }

  private endRequest(): void {
    this.pendingRequests.update(count => Math.max(0, count - 1));
    this.loading.set(this.pendingRequests() > 0);
  }

  private getExportRows(): string[][] {
    const permissions = this.permissionColumns();
    return this.filteredRows().map(row => {
      const primary = this.getPrimaryValue(row);
      const secondary = this.getSecondaryValue(row);
      const permissionValues = permissions.map(permission => (row.permissions.includes(permission) ? 'Yes' : 'No'));
      return [primary, secondary, ...permissionValues];
    });
  }

  private escapeCsv(value: string): string {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  private buildFileName(ext: 'csv' | 'xlsx' | 'pdf'): string {
    const modePart = this.viewMode() === 'ROLE' ? 'by-role' : 'by-object';
    const datePart = new Date().toISOString().slice(0, 10);
    const code = this.getActiveCompanyCode();
    const sanitizedCode = code ? this.sanitizeFileNamePart(code) : '';
    const companyPart = sanitizedCode ? `${sanitizedCode}-` : '';
    return `security-report-${companyPart}${modePart}-${datePart}.${ext}`;
  }

  private sanitizeFileNamePart(value: string): string {
    return value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
