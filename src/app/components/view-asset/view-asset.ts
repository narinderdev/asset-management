import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AssetsService, AssetDetailResponse } from '../../services/assets.service';
import { PmTemplateService } from '../../services/pm-template.service';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';

type AssetDetail = NonNullable<AssetDetailResponse['data']> & {
  assetTypeCode?: string | null;
};
type AssetLocationDetails = Exclude<AssetDetail['location'], string>;

@Component({
  standalone: true,
  selector: 'app-view-asset',
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './view-asset.html',
  styleUrls: ['./view-asset.css']
})
export class ViewAssetComponent implements OnInit {
  asset?: AssetDetail;
  isLoading = false;
  errorMessage?: string;
  assetLoaded = false;

  meterModalOpen = false;
  isSavingMeter = false;

  meterReadingForm = {
    assetId: null as number | null,
    meterType: '',
    readingValue: '',
    readingTime: '',
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assetsService: AssetsService,
    private pmTemplateService: PmTemplateService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
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
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (!this.assetLoaded) {
            this.assetLoaded = true;
            this.cdr.detectChanges();
          }
        })
      )
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

  formatEnum(value?: string): string {
    if (!value) {
      return '-';
    }
    return value
      .toString()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  formatMoney(value?: number | string | null): string {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) {
      return '-';
    }
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    });
  }

  /** NEW: currency formatting for insurance amounts, acquisition costs etc. */
  formatCurrency(value?: number | string | null): string {
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) {
      return String(value);
    }

    // Change currency if your system uses INR, AED, etc.
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(num);
  }

  goBack(): void {
    this.router.navigate(['/assets']);
  }

  get locationDetails(): AssetLocationDetails | undefined {
    const location = this.asset?.location;
    if (!location || typeof location === 'string') {
      return undefined;
    }
    return {
      primaryLocation: (location as any).location ?? location.primaryLocation,
      functionalLocation: location.functionalLocation,
      department: location.department,
      costCenter: location.costCenter,
      assignedOwner: location.assignedOwner,
      maintenanceTeam: location.maintenanceTeam
    } as AssetLocationDetails;
  }

  openMeterModal(): void {
    const threshold = this.asset?.predictiveThresholds?.[0];
    const now = new Date().toISOString().slice(0, 16);

    this.meterReadingForm = {
      assetId: threshold?.assetId ?? (this.asset?.id ? Number(this.asset.id) : null),
      meterType: threshold?.meterType ?? '',
      readingValue: '',
      readingTime: now,
      notes: ''
    };

    setTimeout(() => {
      this.meterModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  closeMeterModal(): void {
    this.meterModalOpen = false;
    this.cdr.detectChanges();
  }

  getMeterUnit(meterType: string): string {
    switch (meterType) {
      case 'RUN_HOURS':
        return 'Hours';
      case 'MILEAGE':
        return 'Miles';
      case 'CYCLES':
        return 'Cycles';
      case 'TEMPERATURE':
        return '\u00B0C';
      default:
        return '';
    }
  }

  submitMeterReading(): void {
    if (
      !this.meterReadingForm.assetId ||
      !this.meterReadingForm.meterType ||
      !this.meterReadingForm.readingValue
    ) {
      return;
    }

    let saved = false;
    this.isSavingMeter = true;

    const payload = {
      assetId: this.meterReadingForm.assetId,
      meterType: this.meterReadingForm.meterType,
      readingValue: Number(this.meterReadingForm.readingValue),
      readingTime: this.meterReadingForm.readingTime,
      notes: this.meterReadingForm.notes || undefined
    };

    this.pmTemplateService
      .createPredictiveMeterReading(payload)
      .pipe(
        finalize(() => {
          this.isSavingMeter = false;
          if (saved) {
            this.closeMeterModal();
            const refreshId = this.asset?.id ?? this.meterReadingForm.assetId;
            if (refreshId !== null && refreshId !== undefined) {
              this.fetchAsset(String(refreshId));
            }
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          saved = true;
          this.toastr.success('Meter reading captured.');
        },
        error: () => {
          this.toastr.error('Unable to save meter reading. Please try again.');
        }
      });
  }
}
