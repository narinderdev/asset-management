import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Asset } from '../../models/assets.models';
import { AssetLocationDetails, AssetsService } from '../../services/assets.service';
import { finalize } from 'rxjs/operators';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

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

  constructor(
    private router: Router,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService
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

    this.hasLoaded = false;
    this.isLoading = true;
    this.errorMessage = undefined;

    this.assetsService
      .fetchAssets(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: ApiAssetResponse) => {
          const content = response.data?.content ?? [];
          this.assets = content.map(a => this.transformApiAsset(a));

          this.totalAssets = response.data?.totalElements ?? this.assets.length;

          const apiPage = response.data?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }

          const apiSize = response.data?.size;
          if (typeof apiSize === 'number' && apiSize > 0) {
            this.itemsPerPage = apiSize;
          }

          this.hasLoaded = true;
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: () => {
          this.assets = [];
          this.filteredAssets = [];
          this.totalAssets = 0;
          this.hasLoaded = true;
          this.toastr.error('Unable to load assets. Please try again.');
          this.cdr.detectChanges();
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

  searchAssets(): void {
    this.applyFilters();
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
