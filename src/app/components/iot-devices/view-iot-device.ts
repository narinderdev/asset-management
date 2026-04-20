import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { Loader } from '../loader/loader';
import { IotDevice, IotDeviceService, IotTelemetryIngestPayload } from '../../services/iot-device.service';

@Component({
  selector: 'app-view-iot-device',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteModalComponent, Loader],
  templateUrl: './view-iot-device.html',
  styleUrls: ['./view-iot-device.css']
})
export class ViewIotDeviceComponent implements OnInit {
  device?: IotDevice;

  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;

  isRotateModalOpen = false;
  isRotatingSecret = false;
  latestRotatedSecret?: string;
  isTelemetryModalOpen = false;
  isTelemetrySubmitting = false;
  telemetryForm = {
    timestamp: '',
    nonce: '',
    signature: '',
    deviceSecret: '',
    body: ''
  };

  private currentDeviceId?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly iotDeviceService: IotDeviceService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing IoT device identifier.';
      this.hasLoaded = true;
      return;
    }

    this.currentDeviceId = id;
    this.loadDevice(id);
  }

  goBack(): void {
    this.router.navigate(['/iot/devices']);
  }

  editDevice(): void {
    if (!this.device?.id) {
      return;
    }

    this.router.navigate(['/iot/devices/edit', this.device.id]);
  }

  openRotateSecretModal(): void {
    this.isRotateModalOpen = true;
  }

  closeRotateSecretModal(): void {
    this.isRotateModalOpen = false;
    this.isRotatingSecret = false;
  }

  confirmRotateSecret(): void {
    const id = this.device?.id ?? this.currentDeviceId;
    if (!id || this.isRotatingSecret) {
      return;
    }

    this.isRotatingSecret = true;

    this.iotDeviceService
      .rotateSecret(id)
      .pipe(
        finalize(() => {
          this.isRotatingSecret = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.latestRotatedSecret = response.data?.newSecret;
          this.toastr.success('Device secret rotated successfully.');
          this.closeRotateSecretModal();
          this.cdr.detectChanges();
        },
        error: () => {
          this.toastr.error('Unable to rotate device secret.');
          this.cdr.detectChanges();
        }
      });
  }

  copySecret(): void {
    if (!this.latestRotatedSecret) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.toastr.info('Clipboard is not available in this browser.');
      return;
    }

    navigator.clipboard.writeText(this.latestRotatedSecret).then(
      () => this.toastr.success('Secret copied to clipboard.'),
      () => this.toastr.error('Unable to copy secret.')
    );
  }

  openTelemetryModal(): void {
    if (!this.device?.deviceUid) {
      this.toastr.error('Device UID is required to ingest telemetry.');
      return;
    }

    this.telemetryForm.timestamp = new Date().toISOString();
    this.telemetryForm.nonce = '';
    this.telemetryForm.signature = '';
    this.telemetryForm.deviceSecret = this.latestRotatedSecret ?? '';
    this.telemetryForm.body = '';
    this.isTelemetryModalOpen = true;
  }

  closeTelemetryModal(): void {
    this.isTelemetryModalOpen = false;
    this.isTelemetrySubmitting = false;
  }

  async submitTelemetry(): Promise<void> {
    if (!this.device?.deviceUid || this.isTelemetrySubmitting) {
      return;
    }

    if (!this.telemetryForm.signature.trim() && this.telemetryForm.deviceSecret.trim()) {
      await this.generateTelemetrySignature(false);
    }

    const signature = this.telemetryForm.signature.trim();
    const body = this.telemetryForm.body;
    const timestamp = this.telemetryForm.timestamp.trim();

    if (!timestamp) {
      this.toastr.error('X-IoT-Timestamp is required.');
      return;
    }

    if (!signature) {
      this.toastr.error('X-IoT-Signature is required.');
      return;
    }

    if (!body.trim()) {
      this.toastr.error('Telemetry payload is required.');
      return;
    }

    const payload: IotTelemetryIngestPayload = {
      deviceUid: this.device.deviceUid,
      timestamp,
      signature,
      nonce: this.telemetryForm.nonce.trim() || undefined,
      body
    };

    this.isTelemetrySubmitting = true;
    this.iotDeviceService
      .ingestTelemetry(payload)
      .pipe(
        finalize(() => {
          this.isTelemetrySubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Telemetry ingested successfully.');
          this.closeTelemetryModal();
        },
        error: () => {
          this.toastr.error('Unable to ingest telemetry.');
          this.cdr.detectChanges();
        }
      });
  }

  onTelemetryInputChange(): void {
    if (!this.isTelemetryModalOpen || !this.telemetryForm.deviceSecret.trim()) {
      return;
    }

    void this.generateTelemetrySignature(false);
  }

  async generateTelemetrySignature(showValidationError = true): Promise<void> {
    if (!this.device?.deviceUid) {
      if (showValidationError) {
        this.toastr.error('Device UID is required to generate signature.');
      }
      return;
    }

    const timestamp = this.telemetryForm.timestamp.trim();
    const nonce = this.telemetryForm.nonce.trim();
    const body = this.telemetryForm.body;
    const secret = this.telemetryForm.deviceSecret.trim();

    if (!timestamp || !body.trim() || !secret) {
      if (showValidationError) {
        this.toastr.error('Timestamp, payload, and secret are required to generate signature.');
      }
      return;
    }

    const canonical = [this.device.deviceUid, timestamp, nonce, body].join('\n');

    try {
      this.telemetryForm.signature = await this.generateHmacSha256Hex(secret, canonical);
      this.cdr.detectChanges();
    } catch {
      if (showValidationError) {
        this.toastr.error('Unable to generate signature in this browser.');
      }
    }
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEnabledLabel(enabled?: boolean): string {
    return enabled ? 'Authorized' : 'Unauthorized';
  }

  getEnabledClass(enabled?: boolean): string {
    return enabled ? 'status-enabled' : 'status-disabled';
  }

  private loadDevice(id: string): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    this.latestRotatedSecret = undefined;

    this.iotDeviceService
      .fetchDeviceById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.device = response.data;

          if (!this.device) {
            this.errorMessage = response.message ?? 'IoT device not found.';
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.device = undefined;
          this.errorMessage = 'Unable to load IoT device details.';
          this.cdr.detectChanges();
        }
      });
  }

  private async generateHmacSha256Hex(secret: string, content: string): Promise<string> {
    const cryptoApi = globalThis.crypto?.subtle;
    if (!cryptoApi) {
      throw new Error('Web Crypto API unavailable');
    }

    const encoder = new TextEncoder();
    const key = await cryptoApi.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await cryptoApi.sign('HMAC', key, encoder.encode(content));
    const signatureBytes = new Uint8Array(signatureBuffer);
    return Array.from(signatureBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
