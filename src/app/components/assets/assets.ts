import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Asset } from '../../models/assets.models';
import {
  AssetImportValidationResponse,
  AssetLocationDetails,
  AssetsService
} from '../../services/assets.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';
import * as XLSX from 'xlsx';
import { CompanyContextService } from '../../services/company-context.service';

interface ApiAssetResponse {
  data?: {
    totalElements?: number;
    size?: number;
    number?: number;
    content?: ApiAssetDto[];
  };
}

interface ApiAssetDto {
  id?: number;
  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetCategory?: string;
  status?: string;
  location?: string | AssetLocationDetails;
  warrantyLifecycle?: {
    lastMaintenanceDate?: string;
    warrantyEnd?: string;
  };
  financialDetails?: {
    acquisitionDate?: string;
  };
}

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, DeleteModalComponent, Loader],
  templateUrl: './assets.html',
  styleUrls: ['./assets.css']
})
export class AssetsComponent implements OnInit {
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];

  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });

  filterAssetName = '';

  totalAssets = 0;
  currentPage = 0;
  itemsPerPage = 10;

  isLoading = false;
  errorMessage?: string;

  isDeleteModalOpen = false;
  assetToDelete?: Asset;
  isDeleting = false;

  canCreateAssets = false;
  canEditAssets = false;
  canDeleteAssets = false;
  isImportModalOpen = false;
  selectedImportFile: File | null = null;
  isImporting = false;
  importStage: 'idle' | 'uploading' | 'validating' | 'ready' | 'committing' = 'idle';
  importJobId: number | null = null;
  validationErrors: Array<{ rowNumber: number; field: string; message: string }> = [];
  private assetsRequestSub?: Subscription;
  private assetsRequestId = 0;
  private readonly importTemplateFields: string[] = [
    'assetName',
    'assetTag',
    'assetType',
    'assetCategory',
    'location',
    'serialNumber',
    'manufacturerName',
    'model',
    'description',
    'department',
    'criticality',
    'status',
    'purchaseDate',
    'purchaseCost',
    'warrantyStartDate',
    'warrantyEndDate',
    'insuranceProvider',
    'insurancePolicyNumber',
    'insuranceStartDate',
    'insuranceEndDate',
    'latitude',
    'longitude'
  ];

  constructor(
    private router: Router,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService,
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadAssets();
  }

  private setPermissions(): void {
    this.canCreateAssets = this.permissionService.hasPermission('ASSET', 'CREATE');
    this.canEditAssets = this.permissionService.hasPermission('ASSET', 'UPDATE');
    this.canDeleteAssets = this.permissionService.hasPermission('ASSET', 'DELETE');
  }

  private loadAssets(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.assetsRequestSub?.unsubscribe();
    const requestId = ++this.assetsRequestId;

    this.hasLoaded = false;
    this.isLoading = true;
    this.errorMessage = undefined;

    this.assetsRequestSub = this.assetsService
      .fetchAssets(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          // Only the latest request can update loading state.
          if (requestId === this.assetsRequestId) {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe({
        next: (response: ApiAssetResponse) => {
          try {
            const rawContent = response?.data?.content;
            const content = Array.isArray(rawContent) ? rawContent : [];
            this.assets = content.map(a => this.transformApiAsset(a));

            this.totalAssets = response?.data?.totalElements ?? this.assets.length;

            const apiPage = response?.data?.number;
            if (typeof apiPage === 'number') {
              this.currentPage = apiPage;
            }

            const apiSize = response?.data?.size;
            if (typeof apiSize === 'number' && apiSize > 0) {
              this.itemsPerPage = apiSize;
            }

            this.applyFilters();
          } catch {
            this.assets = [];
            this.filteredAssets = [];
            this.totalAssets = 0;
            this.toastr.error('Unable to process assets response.');
          }
        },
        error: () => {
          this.assets = [];
          this.filteredAssets = [];
          this.totalAssets = 0;
          this.toastr.error('Unable to load assets. Please try again.');
        }
      });
  }

  /** keeps DOM stable */
  trackByAsset(_: number, asset: Asset): string | number {
    return asset.id ?? asset.assetId;
  }

  private transformApiAsset(asset: ApiAssetDto): Asset {
    return {
      id: asset.id,
      assetId: asset.assetId ?? 'Unknown ID',
      assetName: asset.assetName ?? 'Unnamed Asset',
      category: asset.assetCategory ?? 'Uncategorized',
      type: asset.assetType ?? '—',
      location: this.getApiLocation(asset.location) || 'Not Assigned',
      lastServicedDate:
        asset.warrantyLifecycle?.lastMaintenanceDate ??
        asset.financialDetails?.acquisitionDate ??
        '—',
      warrantyExpiry: asset.warrantyLifecycle?.warrantyEnd ?? '—',
      status: this.normalizeStatus(asset.status)
    };
  }

  private normalizeStatus(status?: string): Asset['status'] {
    if (!status) {
      return 'Active';
    }

    switch (status.toUpperCase()) {
      case 'IN_REPAIR':
      case 'UNDER_MAINTENANCE':
        return 'In Repair';

      case 'RETIRED':
      case 'DECOMMISSIONED':
      case 'RETIRED_FROM_SERVICE':
        return 'Retried'; // ✔ matches Asset model

      case 'IN_SERVICE':
      case 'ACTIVE':
      default:
        return 'Active';
    }
  }

  private getApiLocation(location?: string | AssetLocationDetails): string {
    if (!location) return '';
    if (typeof location === 'string') return location;

    const candidates = [
      location.primaryLocation,
      location.location,
      location.functionalLocation,
      location.department,
      location.costCenter
    ];

    return candidates.find(Boolean) ?? '';
  }

  applyFilters(): void {
    const filter = (v: string) => (v || '').toLowerCase();

    this.filteredAssets = this.assets.filter(asset =>
      !this.filterAssetName ||
      filter(asset.assetName).includes(filter(this.filterAssetName))
    );
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage--;
      this.loadAssets();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage++;
      this.loadAssets();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalAssets / this.itemsPerPage));
  }

  get displayStart(): number {
    return this.totalAssets ? this.currentPage * this.itemsPerPage + 1 : 0;
  }

  get displayEnd(): number {
    return this.totalAssets
      ? Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalAssets)
      : 0;
  }

  refreshAssets(): void {
    this.filterAssetName = '';
    this.currentPage = 0;
    this.loadAssets();
  }

  addNewAsset(): void {
    if (this.canCreateAssets) {
      this.router.navigate(['/assets/add-asset']);
    }
  }

  openImportHistory(): void {
    if (!this.canCreateAssets) return;
    this.router.navigate(['/assets/import-history']);
  }

  importAssets(): void {
    if (!this.canCreateAssets) return;
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

    this.assetsService.fetchImportTemplateFields(companyId).subscribe({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    XLSX.writeFile(workbook, `asset_import_template.${format}`);
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

    this.assetsService
      .importAssets(this.selectedImportFile, companyId)
      .subscribe({
        next: response => {
          const isSuccess =
            (typeof response?.statusCode === 'number' && response.statusCode >= 200 && response.statusCode < 300) ||
            response?.status?.toLowerCase() === 'success';

          if (!isSuccess) {
            this.isImporting = false;
            this.importStage = 'idle';
            const message = response?.message || 'Asset import failed.';
            this.toastr.error(message);
            return;
          }

          const jobId = Number(response?.data?.jobId);
          if (!Number.isFinite(jobId)) {
            this.isImporting = false;
            this.importStage = 'idle';
            this.toastr.error('Upload succeeded but job id is missing.');
            return;
          }
          this.importJobId = jobId;

          // Validation is now provided by upload API response itself.
          const validationErrors = this.extractValidationErrors(response);
          this.validationErrors = validationErrors;
          const invalidRows = this.getValidationInvalidRows(response);
          const hasErrors = validationErrors.length > 0 || invalidRows > 0;

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
          const normalizedErrorPayload = this.normalizeValidationPayload(err?.error);
          this.validationErrors = this.extractValidationErrors(normalizedErrorPayload);
          const message =
            normalizedErrorPayload?.message ||
            (this.validationErrors.length ? 'Asset import validation failed' : 'Unable to import assets. Please try again.');
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

    // Support envelopes like { data: { ...validationData } } and { ...fullResponse }
    const maybeData = candidate?.data;
    if (maybeData && Array.isArray(maybeData?.rowResults)) {
      return candidate;
    }

    if (Array.isArray(candidate?.rowResults)) {
      return { data: candidate, message: candidate?.message };
    }

    if (maybeData?.data && Array.isArray(maybeData.data?.rowResults)) {
      return maybeData;
    }

    return candidate ?? {};
  }

  private extractValidationErrors(payload: AssetImportValidationResponse | any): Array<{ rowNumber: number; field: string; message: string }> {
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

      // Some APIs mark rows INVALID without providing detailed `errors`.
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

  private getValidationInvalidRows(payload: AssetImportValidationResponse | any): number {
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
    this.assetsService
      .commitImport(this.importJobId, companyId)
      .pipe(
        finalize(() => {
          this.isImporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const ok =
            (typeof response?.statusCode === 'number' && response.statusCode >= 200 && response.statusCode < 300) ||
            response?.status?.toLowerCase() === 'success';
          if (!ok) {
            this.importStage = 'ready';
            this.toastr.error(response?.message || 'Unable to confirm import.');
            return;
          }

          this.toastr.success(response?.message || 'Assets import confirmed.');
          this.closeImportModal();
          this.router.navigate(['/assets/import-history'], {
            queryParams: {
              importType: 'ASSET',
              backTo: '/assets'
            }
          });
        },
        error: err => {
          this.importStage = 'ready';
          const message = err?.error?.message || 'Unable to confirm import.';
          this.toastr.error(message);
        }
      });
  }

  editAsset(asset: Asset): void {
    if (!this.canEditAssets || !asset.id) return;

    this.router.navigate(['/assets', 'add-asset', 'asset-master'], {
      queryParams: { id: asset.id, flow: 'edit' }
    });
  }

  viewAsset(asset: Asset): void {
    const id = asset.id?.toString() ?? asset.assetId;
    this.router.navigate(['/assets/view', id]);
  }

  deleteAsset(asset: Asset): void {
    if (!this.canDeleteAssets) return;
    this.assetToDelete = asset;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.assetToDelete = undefined;
    this.isDeleting = false;
    this.cdr.detectChanges();
  }

  confirmDeleteAsset(): void {
    if (!this.canDeleteAssets || !this.assetToDelete?.id) {
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;

    this.assetsService
      .deleteAsset(this.assetToDelete.id.toString())
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Asset deleted successfully.');
          this.closeDeleteModal();
          this.loadAssets();
        },
        error: () => {
          this.toastr.error('Unable to delete asset.');
          this.closeDeleteModal();
        }
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'In Repair':
        return 'status-in-repair';
      case 'Retried':
        return 'status-retried';
      default:
        return '';
    }
  }
}
