import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize, timeout } from 'rxjs';
import {
  InventoryReportItem,
  InventoryReportPage,
  InventoryReportResponse,
  InventoryReportTopStockValueItem,
  InventoryReportTransaction,
  InventoryService,
  WarehouseItem
} from '../../services/inventory.service';
import { Loader } from '../loader/loader';
import { TopNOnHandQtyChartComponent, TopNOnHandQtyItem } from './top-n-onhand-qty-chart';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, TopNOnHandQtyChartComponent],
  templateUrl: './inventory-report.html',
  styleUrls: ['./report.css']
})
export class InventoryReportComponent implements OnInit {
  heading = 'Inventory Report';
  view: 'ITEMS' | 'TRANSACTIONS' = 'ITEMS';
  warehouseId: '' | number = '';
  lowStockOnly = false;
  transactionType = '';
  referenceType = '';
  period = '';
  topN = 5;
  page = 0;
  size = 10;

  totalElements = 0;
  totalPages = 1;

  items: InventoryReportItem[] = [];
  transactions: InventoryReportTransaction[] = [];
  top5HighStock: InventoryReportItem[] = [];
  topStockValue: InventoryReportTopStockValueItem[] = [];
  txnTotals: Array<{ key: string; value: number }> = [];
  warehouses: WarehouseItem[] = [];

  isLoading = false;
  hasLoaded = false;
  errorMessage = '';
  exportMenuOpen = false;
  private reportLoadRequestId = 0;

  readonly transactionTypeOptions = ['', 'RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT'];
  readonly referenceTypeOptions = ['', 'WORK_ORDER', 'PURCHASE_ORDER', 'RECONCILIATION', 'OTHER'];
  readonly periodOptions = ['', 'THIS_MONTH', 'THIS_YEAR', 'THIS_WEEK'];

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.applyRouteView();
    this.loadWarehouses();
    this.loadReport();
  }

  loadReport(resetPage: boolean = false): void {
    const requestId = ++this.reportLoadRequestId;

    if (resetPage) {
      this.page = 0;
    }

    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = '';
    this.items = [];
    this.transactions = [];
    this.top5HighStock = [];
    this.topStockValue = [];
    this.txnTotals = [];

    this.inventoryService
      .fetchInventoryReport({
        view: this.view,
        warehouseId: this.warehouseId === '' ? undefined : Number(this.warehouseId),
        lowStockOnly: this.lowStockOnly,
        transactionType: this.transactionType || undefined,
        referenceType: this.referenceType || undefined,
        period: this.period || undefined,
        topN: this.topN || 5,
        page: this.page,
        size: this.size
      })
      .pipe(
        timeout(20000),
        finalize(() => {
          if (requestId !== this.reportLoadRequestId) {
            return;
          }
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: InventoryReportResponse) => {
          if (requestId !== this.reportLoadRequestId) {
            return;
          }
          const data = res?.data ?? {};
          const itemPage = this.parsePage<InventoryReportItem>(data.items);
          const txnPage = this.parsePage<InventoryReportTransaction>(data.transactions);

          this.items = itemPage.content;
          this.transactions = txnPage.content;
          this.top5HighStock = Array.isArray(data.top5HighStock) ? data.top5HighStock : [];
          this.topStockValue = Array.isArray(data.topStockValue) ? data.topStockValue : [];
          this.txnTotals = Object.entries(data.totalQuantityByTxnType ?? {}).map(([key, value]) => ({
            key,
            value: Number(value ?? 0)
          }));

          const selectedPage = this.view === 'ITEMS' ? itemPage : txnPage;
          this.totalElements = selectedPage.totalElements;
          this.totalPages = Math.max(1, selectedPage.totalPages);
          this.page = selectedPage.page;
          this.size = selectedPage.size || this.size;
        },
        error: () => {
          if (requestId !== this.reportLoadRequestId) {
            return;
          }
          this.items = [];
          this.transactions = [];
          this.top5HighStock = [];
          this.topStockValue = [];
          this.txnTotals = [];
          this.totalElements = 0;
          this.totalPages = 1;
          this.errorMessage = 'Unable to load inventory report.';
        }
      });
  }

  onViewChange(): void {
    if (this.view === 'ITEMS') {
      this.transactionType = '';
      this.referenceType = '';
      this.period = '';
    }
    this.loadReport(true);
  }

  onWarehouseChange(value: '' | number | string): void {
    this.warehouseId = value === '' ? '' : Number(value);
    this.loadReport(true);
  }

  onLowStockOnlyChange(value: boolean): void {
    this.lowStockOnly = Boolean(value);
    this.loadReport(true);
  }

  onTransactionFiltersChange(): void {
    this.loadReport(true);
  }

  previousPage(): void {
    if (this.page > 0 && !this.isLoading) {
      this.page -= 1;
      this.loadReport();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages && !this.isLoading) {
      this.page += 1;
      this.loadReport();
    }
  }

  formatEnum(value?: string): string {
    if (!value) {
      return '--';
    }
    return value.replace(/_/g, ' ');
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

  get rangeStart(): number {
    return this.totalElements > 0 ? this.page * this.size + 1 : 0;
  }

  get rangeEnd(): number {
    return this.totalElements > 0 ? Math.min((this.page + 1) * this.size, this.totalElements) : 0;
  }

  get isItemsView(): boolean {
    return this.view === 'ITEMS';
  }

  get isTransactionsView(): boolean {
    return this.view === 'TRANSACTIONS';
  }

  get onHandChartItems(): TopNOnHandQtyItem[] {
    return this.items.map(item => ({
      itemName: item.itemName || undefined,
      itemCode: item.itemId || '--',
      onHandQty: Number(item.stockLevel ?? 0)
    }));
  }

  get highStockChartItems(): TopNOnHandQtyItem[] {
    return this.top5HighStock.map(item => ({
      itemName: item.itemName || undefined,
      itemCode: item.itemId || '--',
      onHandQty: Number(item.stockLevel ?? 0)
    }));
  }

  get transactionTotalsChartItems(): TopNOnHandQtyItem[] {
    const orderedTypes = this.transactionTypeOptions.filter(value => !!value);
    const totalsByType = new Map(this.txnTotals.map(row => [row.key, Number(row.value ?? 0)]));

    const orderedItems = orderedTypes.map(type => ({
      itemName: this.formatEnum(type),
      itemCode: type,
      onHandQty: totalsByType.get(type) ?? 0
    }));

    const extraItems = this.txnTotals
      .filter(row => !orderedTypes.includes(row.key))
      .map(row => ({
        itemName: this.formatEnum(row.key),
        itemCode: row.key,
        onHandQty: Number(row.value ?? 0)
      }));

    return [...orderedItems, ...extraItems];
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
    const sections = this.getExportSections();
    const hasRows = sections.some(section => section.rows.length > 0);
    const hasCharts = this.getRenderedChartsForPdf().length > 0;
    const hasContent = type === 'pdf' ? hasRows || hasCharts : hasRows;
    if (!hasContent) {
      this.exportMenuOpen = false;
      this.cdr.detectChanges();
      return;
    }

    if (type === 'excel') {
      const table = this.buildHtmlTable(sections);
      this.downloadFile(table, `${this.view === 'ITEMS' ? 'inventory' : 'transaction'}-report.xls`, 'application/vnd.ms-excel');
    } else if (type === 'csv') {
      const csv = this.buildCsv(sections);
      this.downloadFile(csv, `${this.view === 'ITEMS' ? 'inventory' : 'transaction'}-report.csv`, 'text/csv;charset=utf-8;');
    } else {
      this.buildStyledPdf(this.heading, sections);
    }

    this.exportMenuOpen = false;
    this.cdr.detectChanges();
  }

  private loadWarehouses(): void {
    this.inventoryService.fetchWarehouses().subscribe({
      next: res => {
        this.warehouses = Array.isArray(res.data) ? res.data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.warehouses = [];
        this.cdr.detectChanges();
      }
    });
  }

  private parsePage<T>(source: InventoryReportPage<T> | T[] | undefined): {
    content: T[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
  } {
    if (Array.isArray(source)) {
      return {
        content: source,
        totalElements: source.length,
        totalPages: 1,
        page: this.page,
        size: this.size
      };
    }

    const content = Array.isArray(source?.content) ? source.content : [];
    const totalElements = Number(source?.totalElements ?? content.length);
    const totalPages = Number(source?.totalPages ?? (totalElements > 0 ? Math.ceil(totalElements / this.size) : 1));
    const page = Number(source?.number ?? this.page);
    const size = Number(source?.size ?? this.size);

    return {
      content,
      totalElements,
      totalPages: totalPages > 0 ? totalPages : 1,
      page: page >= 0 ? page : 0,
      size: size > 0 ? size : this.size
    };
  }

  private applyRouteView(): void {
    const routeView = (this.route.snapshot.data['reportView'] as 'ITEMS' | 'TRANSACTIONS' | undefined) ?? 'ITEMS';
    this.view = routeView;
    this.heading = routeView === 'TRANSACTIONS' ? 'Transaction Report' : 'Inventory Report';

    if (this.view === 'ITEMS') {
      this.transactionType = '';
      this.referenceType = '';
      this.period = '';
    }
  }

  private getExportSections(): Array<{ title: string; headers: string[]; rows: string[][] }> {
    if (this.isTransactionsView) {
      return [
        {
          title: 'Transactions',
          headers: ['Date Time', 'Type', 'Item', 'Qty Before', 'Qty Change', 'Qty After', 'Reference'],
          rows: this.transactions.map(row => [
            this.formatDateTime(row.dateTime),
            this.formatEnum(row.transactionType),
            row.itemName || row.itemId || '--',
            String(row.qtyBefore ?? 0),
            String(row.qtyChange ?? 0),
            String(row.qtyAfter ?? 0),
            `${this.formatEnum(row.referenceType)} ${row.referenceNumber || ''}`.trim()
          ])
        }
      ];
    }

    return [
      {
        title: 'Items',
        headers: ['Item ID', 'SKU', 'Item Name', 'Stock', 'Reorder Point', 'Warehouse', 'Unit Cost'],
        rows: this.items.map(row => [
          row.itemId || '--',
          row.skuNumber || '--',
          row.itemName || '--',
          String(row.stockLevel ?? 0),
          String(row.reorderPoint ?? 0),
          row.warehouseName || '--',
          String(row.unitCost ?? 0)
        ])
      }
    ];
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

  private buildHtmlTable(sections: Array<{ title: string; headers: string[]; rows: string[][] }>): string {
    const textStyle = 'style="mso-number-format:\\@; white-space:nowrap;"';
    const tables = sections
      .filter(section => section.rows.length > 0)
      .map(section => {
        const title = `<tr><th colspan="${section.headers.length}" ${textStyle}>${section.title}</th></tr>`;
        const thead = `<tr>${section.headers.map(h => `<th ${textStyle}>${h}</th>`).join('')}</tr>`;
        const tbody = section.rows
          .map(r => `<tr>${r.map(c => `<td ${textStyle}>${c}</td>`).join('')}</tr>`)
          .join('');
        return `<table border="1"><thead>${title}${thead}</thead><tbody>${tbody}</tbody></table><br/>`;
      })
      .join('');
    return tables;
  }

  private buildCsv(sections: Array<{ title: string; headers: string[]; rows: string[][] }>): string {
    const chunks = sections
      .filter(section => section.rows.length > 0)
      .map(section => {
        const headerLine = section.headers.map(h => this.escapeCsvValue(h)).join(',');
        const rowLines = section.rows.map(row => row.map(cell => this.escapeCsvValue(cell)).join(','));
        return [this.escapeCsvValue(section.title), headerLine, ...rowLines].join('\n');
      });

    return `\uFEFF${chunks.join('\n\n')}`;
  }

  private escapeCsvValue(value: string): string {
    const safe = String(value ?? '');
    if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  }

  private buildStyledPdf(title: string, sections: Array<{ title: string; headers: string[]; rows: string[][] }>): void {
    const doc = new jsPDF('p', 'pt');
    const margin = 32;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(title, margin, 25);

    doc.setFontSize(9);
    doc.text(this.formatGeneratedText(), pageWidth - margin, 25, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let currentY = 56;
    const filters = this.getActiveFiltersForPdf();
    const charts = this.getRenderedChartsForPdf();

    if (filters.length) {
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text('Filters', margin, currentY + 10);

      autoTable(doc, {
        head: [['Filter', 'Value']],
        body: filters,
        startY: currentY + 18,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [249, 250, 251], textColor: [55, 65, 81], lineWidth: 0.5, lineColor: [229, 231, 235] },
        bodyStyles: { lineWidth: 0.25, lineColor: [229, 231, 235] },
        theme: 'grid',
        margin: { left: margin, right: margin }
      });

      currentY = ((doc as any).lastAutoTable?.finalY ?? currentY + 18) + 16;
    }

    charts.forEach(chart => {
      const availableWidth = pageWidth - margin * 2;
      const ratio = chart.width > 0 && chart.height > 0 ? chart.height / chart.width : 0.56;
      const imageHeight = Math.max(180, Math.min(320, availableWidth * ratio));

      if (currentY + imageHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.addImage(chart.dataUrl, 'PNG', margin, currentY, availableWidth, imageHeight);
      currentY += imageHeight + 16;
    });

    sections
      .filter(section => section.rows.length > 0)
      .forEach(section => {
        if (currentY > pageHeight - 160) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(section.title, margin, currentY + 10);

        autoTable(doc, {
          head: [section.headers],
          body: section.rows,
          startY: currentY + 18,
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [249, 250, 251], textColor: [55, 65, 81], lineWidth: 0.5, lineColor: [229, 231, 235] },
          bodyStyles: { lineWidth: 0.25, lineColor: [229, 231, 235] },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          theme: 'grid',
          margin: { left: margin, right: margin }
        });

        const finalY = (doc as any).lastAutoTable?.finalY ?? currentY + 18;
        currentY = finalY + 22;
      });

    doc.save(`${this.view === 'ITEMS' ? 'inventory' : 'transaction'}-report.pdf`);
  }

  private getActiveFiltersForPdf(): string[][] {
    if (this.isTransactionsView) {
      return [
        ['Transaction Type', this.transactionType ? this.formatEnum(this.transactionType) : 'All Transaction Types'],
        ['Reference Type', this.referenceType ? this.formatEnum(this.referenceType) : 'All Reference Types'],
        ['Period', this.period ? this.formatEnum(this.period) : 'All Periods']
      ];
    }

    const selectedWarehouse = this.warehouses.find(w => String(w.id) === String(this.warehouseId));
    return [
      ['Warehouse', this.warehouseId === '' ? 'All Warehouses' : selectedWarehouse?.name || String(this.warehouseId)],
      ['Low Stock Only', this.lowStockOnly ? 'Yes' : 'No']
    ];
  }

  private getRenderedChartsForPdf(): Array<{ dataUrl: string; width: number; height: number }> {
    const canvases = Array.from(document.querySelectorAll('.report-page .chart-card canvas')) as HTMLCanvasElement[];
    return canvases
      .map(canvas => ({
        dataUrl: canvas.toDataURL('image/png', 1),
        width: canvas.width,
        height: canvas.height
      }))
      .filter(chart => chart.dataUrl.length > 0);
  }

  private formatGeneratedText(): string {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `Generated: ${datePart} at ${timePart}`;
  }
}
