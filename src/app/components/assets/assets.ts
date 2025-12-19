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

  filterAssetId = '';
  filterAssetName = '';
  filterCategory = '';
  filterType = '';

  totalAssets = 0;
  currentPage = 1;
  itemsPerPage = 20;

  isLoading = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  assetToDelete?: Asset;
  isDeleting = false;

  constructor(
    private router: Router,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAssets();
  }

  private loadAssets(): void {
    const pageIndex = Math.max(0, this.currentPage - 1);
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
            this.currentPage = apiPage + 1;
          }
          const apiSize = response.data?.size;
          if (apiSize && apiSize > 0) {
            this.itemsPerPage = apiSize;
          }

          this.applyFilters();
        },
        error: () => {
          this.errorMessage = 'Unable to load assets. Please refresh or try again later.';
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
      const matchesAssetId = !this.filterAssetId ||
        filterText(asset.assetId).includes(filterText(this.filterAssetId));

      const matchesAssetName = !this.filterAssetName ||
        filterText(asset.assetName).includes(filterText(this.filterAssetName));

      const matchesCategory = !this.filterCategory ||
        filterText(asset.category).includes(filterText(this.filterCategory));

      const matchesType = !this.filterType ||
        filterText(asset.type).includes(filterText(this.filterType));

      return matchesAssetId && matchesAssetName && matchesCategory && matchesType;
    });
  }

  searchAssets(): void {
    this.applyFilters();
  }

  refreshAssets(): void {
    this.filterAssetId = '';
    this.filterAssetName = '';
    this.filterCategory = '';
    this.filterType = '';
    this.currentPage = 1;
    this.loadAssets();
  }

  addNewAsset(): void {
    this.router.navigate(['/assets/add-asset']);
  }

  editAsset(asset: Asset): void {
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
    if (!this.assetToDelete) {
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
