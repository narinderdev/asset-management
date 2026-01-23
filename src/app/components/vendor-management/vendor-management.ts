import { ChangeDetectorRef, Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { VendorService } from '../../services/vendor.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { PermissionService } from '../../services/permission.service';

interface Vendor {
  id?: number;
  vendorId: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  paymentTerms: string;
  rating: number;
  status: 'Active' | 'Inactive';
}

interface ApiVendor {
  vendorId?: string;
  vendorName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  rating?: number;
  status?: string;
  active?: boolean;
  id?: number;
}

@Component({
  selector: 'app-vendor-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './vendor-management.html',
  styleUrls: ['./vendor-management.css']
})
export class VendorManagementComponent implements OnInit {
  vendors: Vendor[] = [];
  totalVendors = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  isDeleteModalOpen = false;
  vendorToDelete?: Vendor;
  isDeleting = false;
  canCreateVendors = false;
  canEditVendors = false;
  canDeleteVendors = false;
  showEmptyState = false;

  constructor(
    private router: Router,
    private vendorService: VendorService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadVendors();
  }

  private setPermissions(): void {
    this.canCreateVendors = this.permissionService.hasPermission('VENDOR', 'CREATE');
    this.canEditVendors = this.permissionService.hasPermission('VENDOR', 'UPDATE');
    this.canDeleteVendors = this.permissionService.hasPermission('VENDOR', 'DELETE');
  }

  private loadVendors(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    this.vendors = [];

    this.vendorService
      .fetchVendors(pageIndex, this.itemsPerPage)
      .subscribe({
        next: response => {
          this.zone.run(() => {
            try {
              const content = response.data?.content ?? [];
              this.vendors = content.map(vendor => this.mapVendor(vendor));
              this.showEmptyState = this.vendors.length === 0;
              this.totalVendors = response.data?.totalElements ?? this.vendors.length;
              if (typeof response.data?.size === 'number' && response.data.size > 0) {
                this.itemsPerPage = response.data.size;
              }
              const apiPage = (response.data as any)?.number;
              if (typeof apiPage === 'number') {
                this.currentPage = apiPage;
              }
            } finally {
              this.hasLoaded = true;
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.zone.run(() => {
            this.errorMessage = undefined;
            this.toastr.error('Unable to load vendors right now. Please try again later.');
            this.vendors = [];
            this.showEmptyState = true;
            this.totalVendors = 0;
            this.hasLoaded = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        complete: () => {
          this.zone.run(() => {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private mapVendor(data: ApiVendor): Vendor {
    return {
      id: data.id,
      vendorId: data.vendorId ?? 'ƒ?"',
      vendorName: data.vendorName ?? 'Unnamed Vendor',
      contactPerson: data.contactPerson ?? 'ƒ?"',
      email: data.email ?? '-',
      phone: data.phone ?? '-',
      paymentTerms: this.formatPaymentTerms(data.paymentTerms),
      rating: data.rating ?? 0,
      status: data.active ? 'Active' : 'Inactive'
    };
  }

  private formatPaymentTerms(value?: string): string {
    if (!value) {
      return 'Net 30';
    }
    return value.replace(/_/g, ' ');
  }

  viewVendor(vendor: Vendor): void {
    if (!vendor.id) {
      console.warn('Vendor does not have an ID yet', vendor);
      return;
    }
    this.router.navigate(['/vendor-management/view', vendor.id]);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadVendors();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadVendors();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalVendors / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalVendors) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalVendors) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalVendors);
  }

  editVendor(vendor: Vendor): void {
    if (!this.canEditVendors) {
      return;
    }
    if (!vendor.id) {
      console.warn('Cannot edit vendor without an ID', vendor);
      return;
    }
    this.router.navigate(['/vendor-management/edit', vendor.id]);
  }

  openDeleteModal(vendor: Vendor): void {
    if (!this.canDeleteVendors) {
      return;
    }
    this.vendorToDelete = vendor;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.vendorToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDelete(): void {
    if (!this.canDeleteVendors || !this.vendorToDelete?.id) {
      return;
    }

    this.isDeleting = true;
    this.vendorService
      .deleteVendor(this.vendorToDelete.id)
      .pipe(finalize(() => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadVendors();
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Vendor deleted successfully.');
        },
        error: () => {
          this.toastr.error('Unable to delete vendor. Please try again.');
        }
      });
  }

  addVendor(): void {
    if (!this.canCreateVendors) {
      return;
    }
    this.router.navigate(['/vendor-management/create']);
  }
}

