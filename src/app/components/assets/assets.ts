import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Asset } from '../../models/assets.models';
import { AssetsService } from '../../services/assets.service';
import { finalize } from 'rxjs/operators';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

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
  location?: string | {
    primaryLocation?: string;
  };
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
  imports: [CommonModule, FormsModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './assets.html',
  styleUrls: ['./assets.css']
})
export class AssetsComponent implements OnInit {
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];

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
    this.isLoading = true;
    this.errorMessage = undefined;

    this.assetsService
      .fetchAssets(pageIndex, this.itemsPerPage)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: ApiAssetResponse) => {
          const content = response.data?.content ?? [];
          this.assets = content.map(asset => this.transformApiAsset(asset));
          this.totalAssets = response.data?.totalElements ?? this.assets.length;
          const apiPage = response.data?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }

          this.applyFilters();
        },
        error: () => {
          this.errorMessage = undefined;
          this.toastr.error('Unable to load assets. Please refresh or try again later.');
        }
      });
  }

  private transformApiAsset(asset: ApiAssetDto): Asset {
    return {
      id: asset.id,
      assetId: asset.assetId ?? 'Unknown ID',
      assetName: asset.assetName ?? 'Unnamed Asset',
      category: asset.assetCategory ?? 'Uncategorized',
      type: asset.assetType ?? '—',
      location: this.getApiLocation(asset.location) || 'Not Assigned',
      lastServicedDate: asset.warrantyLifecycle?.lastMaintenanceDate
        ?? asset.financialDetails?.acquisitionDate
        ?? '—',
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
        return 'Retried';
      case 'IN_SERVICE':
      case 'ACTIVE':
      default:
        return 'Active';
    }
  }

  private getApiLocation(location?: string | { primaryLocation?: string }): string {
    if (!location) {
      return '';
    }
    if (typeof location === 'string') {
      return location;
    }
    return location.primaryLocation ?? '';
  }

  applyFilters(): void {
    const filterText = (value: string) => value.toLowerCase();

    this.filteredAssets = this.assets.filter(asset => {
      const matchesAssetName = !this.filterAssetName ||
        filterText(asset.assetName).includes(filterText(this.filterAssetName));

      return matchesAssetName;
    });
  }

  searchAssets(): void {
    this.applyFilters();
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadAssets();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadAssets();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalAssets / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalAssets) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalAssets) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalAssets);
  }

  refreshAssets(): void {
    this.filterAssetName = '';
    this.currentPage = 0;
    this.loadAssets();
  }

  addNewAsset(): void {
    if (!this.canCreateAssets) {
      return;
    }
    this.router.navigate(['/assets/add-asset']);
  }

  editAsset(asset: Asset): void {
    if (!this.canEditAssets) {
      return;
    }
    const id = asset.id?.toString();
    if (!id) {
      console.warn('Unable to edit asset without identifier');
      return;
    }
    this.router.navigate(['/assets', 'add-asset', 'asset-master'], {
      queryParams: { id }
    });
  }

  toggleDropdown(asset: Asset): void {
    console.log('Toggle dropdown for:', asset);
  }

  viewAsset(asset: Asset): void {
    const idParam = asset.id?.toString() ?? asset.assetId;
    this.router.navigate(['/assets/view', idParam]);
  }

  deleteAsset(asset: Asset): void {
    if (!this.canDeleteAssets) {
      return;
    }
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
    if (!this.canDeleteAssets || !this.assetToDelete) {
      return;
    }

    const id = this.assetToDelete.id?.toString();
    if (!id) {
      this.toastr.error('Unable to delete asset. Missing identifier.');
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;
    this.errorMessage = undefined;

    this.assetsService.deleteAsset(id)
      .pipe(finalize(() => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Asset deleted successfully.');
          this.closeDeleteModal();
          this.loadAssets();
        },
        error: () => {
          this.toastr.error('Unable to delete asset. Please try again.');
          this.errorMessage = 'Unable to delete asset. Please try again.';
          this.cdr.detectChanges();
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
