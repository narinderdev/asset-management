import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AssetsService, AssetType } from '../../services/assets.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-asset-type',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-asset-type.html',
  styleUrls: ['./view-asset-type.css']
})
export class ViewAssetTypeComponent implements OnInit {
  assetType?: AssetType;
  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing asset type identifier.';
      return;
    }
    this.fetchAssetType(id);
  }

  private fetchAssetType(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.hasLoaded = false;

    this.assetsService
      .fetchAssetTypeById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.assetType = res.data;
          } else {
            this.errorMessage = res.message ?? 'Asset type not found.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load asset type details.';
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/assets/types']);
  }

  formatField(value?: string | number | null): string {
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    return String(value);
  }

  formatBoolean(value?: boolean): string {
    if (value === undefined || value === null) {
      return '—';
    }
    return value ? 'Yes' : 'No';
  }
}
