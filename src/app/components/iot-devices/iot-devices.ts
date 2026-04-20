import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { IotDevice, IotDeviceService } from '../../services/iot-device.service';

@Component({
  selector: 'app-iot-devices',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './iot-devices.html',
  styleUrls: ['./iot-devices.css']
})
export class IotDevicesComponent implements OnInit {
  devices: IotDevice[] = [];
  totalDevices = 0;
  currentPage = 0;
  itemsPerPage = 10;

  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;

  loadingRows = Array.from({ length: 5 });

  constructor(
    private readonly router: Router,
    private readonly iotDeviceService: IotDeviceService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    const pageIndex = Math.max(0, this.currentPage);

    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    this.devices = [];

    this.iotDeviceService
      .fetchDevices(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.devices = response.data?.content ?? [];
          this.totalDevices = response.data?.totalElements ?? this.devices.length;

          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }

          if (typeof response.data?.page === 'number') {
            this.currentPage = response.data.page;
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.devices = [];
          this.totalDevices = 0;
          this.errorMessage = 'Unable to load IoT devices.';
          this.toastr.error('Unable to load IoT devices. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  createDevice(): void {
    this.router.navigate(['/iot/devices/create']);
  }

  viewDevice(device: IotDevice): void {
    if (!device.id) {
      return;
    }

    this.router.navigate(['/iot/devices/view', device.id]);
  }

  editDevice(device: IotDevice): void {
    if (!device.id) {
      return;
    }

    this.router.navigate(['/iot/devices/edit', device.id]);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadDevices();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadDevices();
    }
  }

  refresh(): void {
    this.currentPage = 0;
    this.loadDevices();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalDevices / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalDevices) {
      return 0;
    }

    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalDevices) {
      return 0;
    }

    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalDevices);
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

  getEnabledClass(enabled?: boolean): string {
    if (enabled) {
      return 'status-enabled';
    }

    return 'status-disabled';
  }

  getEnabledLabel(enabled?: boolean): string {
    return enabled ? 'Authorized' : 'Unauthorized';
  }
}
