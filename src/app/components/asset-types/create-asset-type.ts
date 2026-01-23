import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
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
  assetType: AssetTypeCreatePayload = {
    code: '',
    name: '',
    assetCategoryId: 0,
    defaultCriticality: 'LOW',
    defaultGlAccount: '',
    insuranceRequired: true,
    active: true
  };

  categories: AssetCategory[] = [];
  isSubmitting = false;

  constructor(
    private assetsService: AssetsService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.assetsService.fetchAssetCategories().subscribe({
      next: (res) => {
        this.categories = res.data ?? [];
      },
      error: () => {
        this.categories = [];
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
    this.assetsService.createAssetType(this.assetType).subscribe({
      next: () => {
        this.toastr.success('Asset type created successfully.');
        this.router.navigate(['/assets/types']);
      },
      error: () => {
        this.toastr.error('Failed to create asset type. Please try again.');
        this.isSubmitting = false;
      }
    });
  }
}
