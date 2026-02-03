import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AssetsService, AssetType } from '../../services/assets.service';
import { Loader } from '../loader/loader';
import { DeleteModalComponent } from '../delete-modal/delete-modal';

@Component({
  selector: 'app-asset-types',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, Loader, DeleteModalComponent],
  templateUrl: './asset-types.html',
  styleUrls: ['./asset-types.css']
})
export class AssetTypesComponent implements OnInit {
  assetTypes: AssetType[] = [];
  filteredTypes: AssetType[] = [];
  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;
  filterName = '';
  loadingRows = Array.from({ length: 5 });
  showDeleteModal = false;
  deleting = false;
  deleteTarget?: AssetType;

  constructor(
    private assetsService: AssetsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssetTypes();
  }

  private loadAssetTypes(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    this.cdr.detectChanges();

    this.assetsService
      .fetchAssetTypes()
      .subscribe({
        next: (response) => {
          const types = response.data ?? [];
          this.assetTypes = types.map((t) => this.transformType(t));
          this.applyFilter();
          this.hasLoaded = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.assetTypes = [];
          this.filteredTypes = [];
          this.errorMessage = 'Unable to load asset types. Please try again.';
          this.hasLoaded = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private transformType(type: AssetType): AssetType {
    return {
      ...type,
      code: type.code || '--',
      name: type.name || 'Unknown',
      assetCategory: type.assetCategory || 'Uncategorized',
      defaultCriticality: type.defaultCriticality || 'Low',
      defaultGlAccount: type.defaultGlAccount || '--',
      insuranceRequired: typeof type.insuranceRequired === 'boolean' ? type.insuranceRequired : false,
      active: typeof type.active === 'boolean' ? type.active : false
    };
  }

  applyFilter(): void {
    const term = this.filterName.trim().toLowerCase();
    if (!term) {
      this.filteredTypes = [...this.assetTypes];
      this.cdr.detectChanges();
      return;
    }
    this.filteredTypes = this.assetTypes.filter((t) =>
      (t.name || '').toLowerCase().includes(term) || (t.code || '').toLowerCase().includes(term)
    );
    this.cdr.detectChanges();
  }

  refresh(): void {
    this.filterName = '';
    this.loadAssetTypes();
  }

  onView(type: AssetType): void {
    const identifier = type.id ?? type.code;
    if (!identifier) {
      return;
    }
    this.router.navigate(['/assets/types/view', identifier]);
  }

  onEdit(type: AssetType): void {
    const identifier = type.id ?? type.code;
    if (!identifier) {
      return;
    }
    this.router.navigate(['/assets/types/edit', identifier]);
  }

  onDelete(type: AssetType): void {
    this.deleteTarget = type;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) {
      this.closeDeleteModal();
      return;
    }
    this.deleting = true;
    this.assetsService.deleteAssetType(this.deleteTarget.id).subscribe({
      next: () => {
        // Refresh from API to ensure latest list
        this.loadAssetTypes();
        this.closeDeleteModal();
      },
      error: () => {
        this.deleting = false;
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleting = false;
    this.deleteTarget = undefined;
    this.cdr.detectChanges();
  }

  goToCreate(): void {
    this.router.navigate(['/assets/types/create']);
  }

  trackByType(_: number, type: AssetType): number | string | undefined {
    return type.id ?? type.code;
  }
}
