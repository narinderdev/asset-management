import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import {
  IotDeviceCreatePayload,
  IotDeviceService,
  IotDeviceUpdatePayload
} from '../../services/iot-device.service';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-create-iot-device',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-iot-device.html',
  styleUrls: ['./create-iot-device.css']
})
export class CreateIotDeviceComponent implements OnInit {
  isEditMode = false;
  deviceId?: string;

  isLoadingDetails = false;
  hasLoadedDetails = false;
  isSubmitting = false;
  errorMessage?: string;
  assetOptions: Array<{ id: string; label: string; locationText: string }> = [];
  private assetOptionMap: Record<string, { id: string; label: string; locationText: string }> = {};

  device = {
    deviceUid: '',
    deviceName: '',
    assetId: '',
    location: '',
    enabled: true
  };

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly iotDeviceService: IotDeviceService,
    private readonly assetsService: AssetsService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssetOptions();

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.hasLoadedDetails = true;
      return;
    }

    this.isEditMode = true;
    this.deviceId = id;
    this.loadDevice(id);
  }

  onCancel(): void {
    this.router.navigate(['/iot/devices']);
  }

  onAssetChange(assetId: string): void {
    this.device.assetId = assetId;
    const selectedAsset = this.assetOptionMap[assetId];
    this.device.location = selectedAsset?.locationText ?? '';
  }

  onSubmit(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;

    const request$ = this.isEditMode && this.deviceId
      ? this.iotDeviceService.updateDevice(this.deviceId, payload as IotDeviceUpdatePayload)
      : this.iotDeviceService.createDevice(payload as IotDeviceCreatePayload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditMode ? 'Device updated successfully.' : 'Device created successfully.');
          this.router.navigate(['/iot/devices']);
        },
        error: () => {
          this.errorMessage = this.isEditMode
            ? 'Unable to update device. Please try again.'
            : 'Unable to create device. Please try again.';
          this.toastr.error(this.errorMessage);
          this.cdr.detectChanges();
        }
      });
  }

  private loadDevice(id: string): void {
    this.isLoadingDetails = true;
    this.errorMessage = undefined;
    this.hasLoadedDetails = false;

    this.iotDeviceService
      .fetchDeviceById(id)
      .pipe(
        finalize(() => {
          this.isLoadingDetails = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage = response.message ?? 'Unable to load device details.';
            this.hasLoadedDetails = true;
            this.cdr.detectChanges();
            return;
          }

          this.device = {
            deviceUid: response.data.deviceUid ?? '',
            deviceName: response.data.deviceName ?? '',
            assetId: response.data.assetId ? String(response.data.assetId) : '',
            location: response.data.location ?? '',
            enabled: response.data.enabled ?? true
          };

          this.hasLoadedDetails = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load device details.';
          this.hasLoadedDetails = true;
          this.cdr.detectChanges();
        }
      });
  }

  private buildPayload(): IotDeviceCreatePayload | IotDeviceUpdatePayload | null {
    const deviceName = this.device.deviceName.trim();
    const location = this.device.location.trim();

    if (!deviceName) {
      this.errorMessage = 'Device name is required.';
      return null;
    }

    const assetId = this.parseAssetId(this.device.assetId);
    if (this.device.assetId && assetId === undefined) {
      this.errorMessage = 'Asset ID must be a valid number.';
      return null;
    }

    if (this.isEditMode) {
      return {
        deviceName,
        assetId,
        location,
        enabled: this.device.enabled
      };
    }

    const deviceUid = this.device.deviceUid.trim();
    if (!deviceUid) {
      this.errorMessage = 'Device UID is required.';
      return null;
    }

    return {
      deviceUid,
      deviceName,
      assetId,
      location,
      enabled: this.device.enabled
    };
  }

  private parseAssetId(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return parsed;
  }

  private loadAssetOptions(): void {
    this.assetsService.fetchAssets(0, 500).subscribe({
      next: (response) => {
        const content = response.data?.content ?? [];
        this.assetOptions = content
          .filter(asset => asset.id !== undefined)
          .map(asset => ({
            id: String(asset.id),
            label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`,
            locationText: this.getAssetLocationText(asset.location)
          }));
        this.assetOptionMap = this.assetOptions.reduce((acc, asset) => {
          acc[asset.id] = asset;
          return acc;
        }, {} as Record<string, { id: string; label: string; locationText: string }>);
        if (this.device.assetId) {
          this.onAssetChange(this.device.assetId);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.assetOptions = [];
        this.toastr.error('Unable to load assets for device mapping.');
        this.cdr.detectChanges();
      }
    });
  }

  private getAssetLocationText(location: unknown): string {
    if (!location) {
      return '';
    }

    if (typeof location === 'string') {
      return location;
    }

    if (typeof location === 'object') {
      const locationObj = location as Record<string, unknown>;
      const candidates = [
        locationObj['location'],
        locationObj['primaryLocation'],
        locationObj['functionalLocation'],
        locationObj['department'],
        locationObj['costCenter']
      ];
      const firstText = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
      return typeof firstText === 'string' ? firstText : '';
    }

    return '';
  }
}
