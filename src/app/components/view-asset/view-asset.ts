import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AssetsService, AssetDetailResponse } from '../../services/assets.service';

type AssetDetail = NonNullable<AssetDetailResponse['data']>;
type AssetLocationDetails = Exclude<AssetDetail['location'], string>;

@Component({
  standalone: true,
  selector: 'app-view-asset',
  imports: [CommonModule],
  templateUrl: './view-asset.html',
  styleUrls: ['./view-asset.css']
})
export class ViewAssetComponent implements OnInit {
  asset?: AssetDetail;
  isLoading = false;
  errorMessage?: string;
  assetLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const assetId = this.route.snapshot.paramMap.get('id');
    if (!assetId) {
      this.errorMessage = 'Missing asset identifier.';
      return;
    }

    this.fetchAsset(assetId);
  }

  private fetchAsset(id: string): void {
    this.isLoading = true;
    this.assetLoaded = false;
    this.errorMessage = undefined;

    this.assetsService
      .fetchAssetById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        if (!this.assetLoaded) {
          this.assetLoaded = true;
          this.cdr.detectChanges();
        }
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            this.asset = response.data;
          } else {
            this.errorMessage = response.message ?? 'Asset not found.';
          }
          this.assetLoaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load asset details. Please try again later.';
          this.assetLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  formatField(value?: string | number | null): string {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    return String(value);
  }

  formatBoolean(value?: boolean): string {
    if (value === undefined || value === null) {
      return '-';
    }
    return value ? 'Yes' : 'No';
  }

  goBack(): void {
    this.router.navigate(['/assets']);
  }

  get locationDetails(): AssetLocationDetails | undefined {
    const location = this.asset?.location;
    if (!location || typeof location === 'string') {
      return undefined;
    }
    return location;
  }
}
