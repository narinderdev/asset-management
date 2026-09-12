import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import {
  InventoryImportValidationResponse,
  InventoryService
} from '../../services/inventory.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';
import { CompanyContextService } from '../../services/company-context.service';

interface InventoryItem {
  id?: number;
  itemId: string;
  itemName: string;
  category: string;
  manufacturer: string;
  stockLevel: number;
  reorderPoint: number;
  costPerUnit: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, DeleteModalComponent, Loader],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css']
})
export class InventoryComponent implements OnInit {
  inventory: InventoryItem[] = [];
  totalInventory = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  showEmptyState = false;

  isDeleteModalOpen = false;
  itemToDelete?: InventoryItem;
  isDeleting = false;
  canCreateInventory = false;
  canEditInventory = false;
  canDeleteInventory = false;
  isImportModalOpen = false;
  selectedImportFile: File | null = null;
  isImporting = false;
  importStage: 'idle' | 'uploading' | 'validating' | 'ready' | 'committing' = 'idle';
  importJobId: number | null = null;
  validationErrors: Array<{ rowNumber: number; field: string; message: string }> = [];
  private readonly importTemplateFields: string[] = [
    'itemName',
    'itemId',
    'skuNumber',
    'category',
    'unitOfMeasure',
    'manufacturer',
    'manufacturerPartNumber',
    'stockLevel',
    'reorderPoint',
    'reorderQuantity',
    'minStockLevel',
    'maxStockLevel',
    'costPerUnit',
    'glAccountString',
    'expenseCode',
    'warehouseId',
    'primaryVendorDbId',
    'active'
  ];

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService,
    private zone: NgZone,
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadInventory();
  }

  private setPermissions(): void {
    this.canCreateInventory = this.permissionService.hasPermission('INVENTORY', 'CREATE');
    this.canEditInventory = this.permissionService.hasPermission('INVENTORY', 'UPDATE');
    this.canDeleteInventory = this.permissionService.hasPermission('INVENTORY', 'DELETE');
  }

  private loadInventory(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.inventory = [];

    this.inventoryService
      .fetchInventory(pageIndex, this.itemsPerPage)
      .subscribe({
        next: response => {
          this.zone.run(() => {
            const content = response.data?.content ?? [];
            this.inventory = content.map(item => this.mapItem(item));
            this.showEmptyState = this.inventory.length === 0;
            this.totalInventory = response.data?.totalElements ?? this.inventory.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.itemsPerPage = response.data.size;
            }
            const apiPage = response.data?.number;
            if (typeof apiPage === 'number') {
              this.currentPage = apiPage;
            }
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.errorMessage = undefined;
            this.toastr.error('Unable to load inventory. Please try again later.');
            this.inventory = [];
            this.showEmptyState = true;
            this.totalInventory = 0;
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        complete: () => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadInventory();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadInventory();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalInventory / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalInventory) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalInventory) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalInventory);
  }

  formatLabel(value?: string): string {
    if (!value) {
      return 'Unknown';
    }
    const normalized = value.replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private mapItem(item: {
    id?: number;
    itemId?: string;
    itemName?: string;
    category?: string;
    manufacturer?: string;
    stockLevel?: number;
    reorderPoint?: number;
    costPerUnit?: number;
  }): InventoryItem {
    const stockLevel = item.stockLevel ?? 0;
    const reorderPoint = item.reorderPoint ?? 0;

    return {
      id: item.id,
      itemId: item.itemId ?? '—',
      itemName: item.itemName ?? 'Unnamed Item',
      category: this.formatLabel(item.category),
      manufacturer: item.manufacturer ?? 'Unknown',
      stockLevel,
      reorderPoint,
      costPerUnit: this.formatCurrency(item.costPerUnit),
      status: this.resolveStatus(stockLevel, reorderPoint)
    };
  }

  private formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  private resolveStatus(stock: number, reorderPoint: number): InventoryItem['status'] {
    if (stock <= 0) {
      return 'Out of Stock';
    }
    if (stock <= reorderPoint) {
      return 'Low Stock';
    }
    return 'In Stock';
  }

  addInventoryItem(): void {
    if (!this.canCreateInventory) {
      return;
    }
    this.router.navigate(['/inventory/create']);
  }

  openImportHistory(): void {
    this.router.navigate(['/assets/import-history'], {
      queryParams: {
        importType: 'INVENTORY',
        backTo: '/inventory'
      }
    });
  }

  openImportModal(): void {
    if (!this.canCreateInventory) {
      return;
    }
    this.selectedImportFile = null;
    this.importStage = 'idle';
    this.importJobId = null;
    this.validationErrors = [];
    this.isImportModalOpen = true;
  }

  closeImportModal(): void {
    this.isImportModalOpen = false;
    this.selectedImportFile = null;
    this.isImporting = false;
    this.importStage = 'idle';
    this.importJobId = null;
    this.validationErrors = [];
  }

  downloadTemplate(format: 'xlsx' | 'csv'): void {
    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId === null) {
      this.toastr.error('No company selected. Please select a company and try again.');
      return;
    }

    this.inventoryService.fetchInventoryImportTemplateFields(companyId).subscribe({
      next: response => {
        const apiFields = response?.data?.allFields?.filter(Boolean) ?? [];
        const fields = apiFields.length > 0 ? apiFields : this.importTemplateFields;
        this.downloadTemplateWithFields(format, fields);
      },
      error: () => {
        this.toastr.warning('Using default template fields.');
        this.downloadTemplateWithFields(format, this.importTemplateFields);
      }
    });
  }

  private downloadTemplateWithFields(format: 'xlsx' | 'csv', fields: string[]): void {
    const worksheet = XLSX.utils.json_to_sheet([], { header: fields });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, `inventory_import_template.${format}`);
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedImportFile = null;
      return;
    }

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isSupported = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isSupported) {
      this.toastr.error('Please upload a CSV or Excel file.');
      this.selectedImportFile = null;
      input.value = '';
      return;
    }

    this.selectedImportFile = file;
    this.importStage = 'idle';
    this.importJobId = null;
    this.validationErrors = [];
  }

  clearSelectedImportFile(input?: HTMLInputElement): void {
    this.selectedImportFile = null;
    this.importStage = 'idle';
    this.importJobId = null;
    this.validationErrors = [];
    if (input) {
      input.value = '';
    }
  }

  submitImport(): void {
    if (this.importStage === 'ready') {
      this.confirmImport();
      return;
    }

    if (!this.selectedImportFile || this.isImporting) {
      if (!this.selectedImportFile) {
        this.toastr.warning('Please select a file to import.');
      }
      return;
    }

    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId === null) {
      this.toastr.error('No company selected. Please select a company and try again.');
      return;
    }

    this.isImporting = true;
    this.importStage = 'uploading';
    this.validationErrors = [];

    this.inventoryService.importInventory(this.selectedImportFile, companyId).subscribe({
      next: response => {
        const isSuccess =
          (typeof response?.statusCode === 'number' && response.statusCode >= 200 && response.statusCode < 300) ||
          response?.status?.toLowerCase() === 'success';

        if (!isSuccess) {
          this.isImporting = false;
          this.importStage = 'idle';
          const normalized = this.normalizeValidationPayload(response);
          this.validationErrors = this.extractValidationErrors(normalized);
          this.toastr.error(response?.message || 'Inventory import failed.');
          this.cdr.detectChanges();
          return;
        }

        const jobId = Number(response?.data?.jobId);
        if (!Number.isFinite(jobId)) {
          this.isImporting = false;
          this.importStage = 'idle';
          const normalized = this.normalizeValidationPayload(response);
          this.validationErrors = this.extractValidationErrors(normalized);
          this.toastr.error(response?.message || 'Inventory import validation failed');
          this.cdr.detectChanges();
          return;
        }

        this.importJobId = jobId;
        const normalized = this.normalizeValidationPayload(response);
        this.validationErrors = this.extractValidationErrors(normalized);
        const invalidRows = this.getValidationInvalidRows(normalized);
        const hasErrors = this.validationErrors.length > 0 || invalidRows > 0;

        this.isImporting = false;
        if (hasErrors) {
          this.importStage = 'idle';
          this.toastr.error(response?.message || 'Validation failed. Please fix the errors.');
          this.cdr.detectChanges();
          return;
        }

        this.importStage = 'ready';
        this.toastr.success('Upload completed. Click Confirm to finish import.');
        this.cdr.detectChanges();
      },
      error: err => {
        this.isImporting = false;
        this.importStage = 'idle';
        const normalized = this.normalizeValidationPayload(err?.error);
        this.validationErrors = this.extractValidationErrors(normalized);
        const message =
          normalized?.message ||
          (this.validationErrors.length ? 'Inventory import validation failed' : 'Unable to import inventory. Please try again.');
        this.toastr.error(message);
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeValidationPayload(payload: any): any {
    let candidate = payload;
    if (typeof candidate === 'string') {
      try {
        candidate = JSON.parse(candidate);
      } catch {
        return {};
      }
    }

    if (candidate?.data?.rowResults && Array.isArray(candidate.data.rowResults)) {
      return candidate;
    }
    if (Array.isArray(candidate?.rowResults)) {
      return { data: candidate, message: candidate?.message };
    }
    return candidate ?? {};
  }

  private extractValidationErrors(payload: InventoryImportValidationResponse | any): Array<{ rowNumber: number; field: string; message: string }> {
    const rowResults = payload?.data?.rowResults ?? payload?.rowResults ?? [];
    if (!Array.isArray(rowResults)) return [];

    return rowResults.flatMap((row: any) => {
      const rowNumber = Number(row?.rowNumber ?? 0);
      const rowStatus = String(row?.status ?? '').toUpperCase();
      const errors = Array.isArray(row?.errors) ? row.errors : [];

      if (errors.length > 0) {
        return errors.map((err: any) => ({
          rowNumber,
          field: String(err?.field ?? 'field'),
          message: String(err?.message ?? 'Validation error')
        }));
      }

      if (rowStatus === 'INVALID') {
        return [{
          rowNumber,
          field: 'row',
          message: 'Row validation failed'
        }];
      }

      return [];
    });
  }

  private getValidationInvalidRows(payload: InventoryImportValidationResponse | any): number {
    const raw = payload?.data?.invalidRows ?? payload?.invalidRows ?? 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private confirmImport(): void {
    if (this.isImporting) return;
    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId === null || this.importJobId === null) {
      this.toastr.error('Missing company or job details for confirmation.');
      return;
    }

    this.isImporting = true;
    this.importStage = 'committing';

    this.inventoryService.commitInventoryImport(this.importJobId, companyId).pipe(
      finalize(() => {
        this.isImporting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: response => {
        const ok =
          (typeof response?.statusCode === 'number' && response.statusCode >= 200 && response.statusCode < 300) ||
          response?.status?.toLowerCase() === 'success';
        if (!ok) {
          this.importStage = 'ready';
          this.toastr.error(response?.message || 'Unable to confirm import.');
          return;
        }

        this.toastr.success(response?.message || 'Inventory import confirmed.');
        this.closeImportModal();
        this.router.navigate(['/assets/import-history'], {
          queryParams: {
            importType: 'INVENTORY',
            backTo: '/inventory'
          }
        });
      },
      error: err => {
        this.importStage = 'ready';
        this.toastr.error(err?.error?.message || 'Unable to confirm import.');
      }
    });
  }

  viewInventory(item: InventoryItem): void {
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/view', item.id]);
  }

  editInventory(item: InventoryItem): void {
    if (!this.canEditInventory) {
      return;
    }
    if (!item.id) {
      return;
    }

    this.router.navigate(['/inventory/edit', item.id]);
  }

  promptDeleteInventory(item: InventoryItem): void {
    if (!this.canDeleteInventory) {
      return;
    }
    this.itemToDelete = item;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.itemToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDeleteInventory(): void {
    if (!this.canDeleteInventory || !this.itemToDelete?.id) {
      return;
    }

    this.isDeleting = true;

    this.inventoryService.deleteInventory(this.itemToDelete.id).pipe(
      finalize(() => {
        this.isDeleting = false;
      })
    ).subscribe({
      next: () => {
        this.toastr.success('Inventory item deleted.');
        this.closeDeleteModal();
        this.loadInventory();
      },
      error: () => {
        this.toastr.error('Unable to delete inventory item. Please try again.');
        this.closeDeleteModal();
      }
    });
  }
}
