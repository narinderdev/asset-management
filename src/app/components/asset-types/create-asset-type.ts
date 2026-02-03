import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetsService, AssetCategory, AssetTypeCreatePayload } from '../../services/assets.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-asset-type',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create-asset-type.html',
  styleUrls: ['./create-asset-type.css']
})
export class CreateAssetTypeComponent implements OnInit {
  isEditMode = false;
  assetTypeId?: string;
  assetType: AssetTypeCreatePayload = {
    code: '',
    name: '',
    assetCategoryId: 0,
    defaultCriticality: 'LOW',
    defaultGlAccount: '',
    utilityAccount: '',
    retirementAccount: '',
    insuranceRequired: true,
    active: true
  };

  categories: AssetCategory[] = [];
  isSubmitting = false;

  constructor(
    private assetsService: AssetsService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.assetTypeId = this.route.snapshot.paramMap.get('id') ?? undefined;
    this.isEditMode = !!this.assetTypeId;
    this.loadCategories();
    if (this.isEditMode && this.assetTypeId) {
      this.loadAssetType(this.assetTypeId);
    }
  }

  private loadCategories(): void {
    this.assetsService.fetchAssetCategories().subscribe({
      next: (res) => {
        this.categories = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadAssetType(id: string): void {
    this.assetsService.fetchAssetTypeById(id).subscribe({
      next: (res) => {
        if (res.data) {
          const type = res.data;
          this.assetType = {
            code: type.code ?? '',
            name: type.name ?? '',
            assetCategoryId: type.assetCategoryId ?? 0,
            defaultCriticality: type.defaultCriticality ?? 'LOW',
            defaultGlAccount: type.defaultGlAccount ?? '',
            utilityAccount: type.utilityAccount ?? '',
            retirementAccount: type.retirementAccount ?? '',
            insuranceRequired: type.insuranceRequired ?? false,
            active: type.active ?? false
          };
          this.cdr.detectChanges();
        } else {
          this.toastr.error('Asset type not found.');
          this.router.navigate(['/assets/types']);
        }
      },
      error: () => {
        this.toastr.error('Failed to load asset type.');
        this.router.navigate(['/assets/types']);
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/assets/types']);
  }

  submit(): void {
    if (!this.assetType.code || !this.assetType.name || !this.assetType.assetCategoryId) {
      this.toastr.warning('Please fill required fields.');
      return;
    }

    this.isSubmitting = true;
    const request$ = this.isEditMode && this.assetTypeId
      ? this.assetsService.updateAssetType(this.assetTypeId, this.assetType)
      : this.assetsService.createAssetType(this.assetType);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Asset type updated successfully.' : 'Asset type created successfully.');
        this.router.navigate(['/assets/types']);
      },
      error: () => {
        this.toastr.error(this.isEditMode ? 'Failed to update asset type. Please try again.' : 'Failed to create asset type. Please try again.');
        this.isSubmitting = false;
      }
    });
  }
}
