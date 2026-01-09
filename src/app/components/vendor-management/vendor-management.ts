import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  isLoading = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  vendorToDelete?: Vendor;
  isDeleting = false;
  canCreateVendors = false;
  canEditVendors = false;
  canDeleteVendors = false;

  constructor(
    private router: Router,
    private vendorService: VendorService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService
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
    this.isLoading = true;
    this.errorMessage = undefined;

    this.vendorService
      .fetchVendors(0, 20)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.vendors = content.map(vendor => this.mapVendor(vendor));
        },
        error: () => {
          this.errorMessage = 'Unable to load vendors right now. Please try again later.';
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

