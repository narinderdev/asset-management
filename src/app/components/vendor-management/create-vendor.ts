import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { VendorService, CreateVendorPayload } from '../../services/vendor.service';
import { ToastrService } from 'ngx-toastr';

interface PaymentOption {
  value: string;
  label: string;
}

const PAYMENT_TERMS_OPTIONS: PaymentOption[] = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' }
];

const DEFAULT_PAYMENT_TERM = 'NET_30';

@Component({
  selector: 'app-create-vendor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-vendor.html',
  styleUrls: ['./create-vendor.css']
})
export class CreateVendorComponent implements OnInit {
  vendor = {
    vendorId: '',
    vendorName: '',
    taxId: '',
    address: '',
    contactPerson: '',
    email: '',
    phone: '',
    paymentTerms: DEFAULT_PAYMENT_TERM,
    rating: '3',
    active: true
  };

  paymentOptions = PAYMENT_TERMS_OPTIONS;
  ratingOptions = ['1', '2', '3', '4', '5'];

  autoGenerateVendorId = false;

  isSubmitting = false;
  isLoadingDetails = false;
  errorMessage?: string;
  isEditMode = false;
  editVendorId?: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vendorService: VendorService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const vendorId = Number(idParam);
    if (Number.isNaN(vendorId)) {
      this.errorMessage = 'Invalid vendor identifier.';
      return;
    }

    this.isEditMode = true;
    this.editVendorId = vendorId;
    this.loadVendor(vendorId);
  }

  onCancel(): void {
    this.router.navigate(['/vendor-management']);
  }

  onAutoGenerateVendorIdChange(): void {
    if (this.autoGenerateVendorId) {
      this.vendor.vendorId = '';
    }
  }

  onCreate(form: NgForm): void {
    if (this.isSubmitting || this.isLoadingDetails) {
      return;
    }

    if (!form.valid) {
      this.errorMessage = 'Please provide a valid email address.';
      return;
    }

    this.errorMessage = undefined;
    this.isSubmitting = true;

    const payload: CreateVendorPayload = {
      vendorName: this.vendor.vendorName,
      taxId: this.vendor.taxId || undefined,
      address: this.vendor.address,
      contactPerson: this.vendor.contactPerson,
      email: this.vendor.email,
      phone: this.vendor.phone,
      paymentTerms: this.vendor.paymentTerms || DEFAULT_PAYMENT_TERM,
      rating: Number(this.vendor.rating) || 0,
      active: this.vendor.active
    };

    if (this.isEditMode || !this.autoGenerateVendorId) {
      payload.vendorId = this.vendor.vendorId;
    }

    const operation = this.isEditMode && this.editVendorId
      ? this.vendorService.updateVendor(this.editVendorId, payload)
      : this.vendorService.createVendor(payload);

    operation
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          if (this.isEditMode) {
            this.toastr.success('Vendor updated successfully');
          } else {
            this.toastr.success('Vendor created successfully');
          }
          this.router.navigate(['/vendor-management']);
        },
        error: () => {
          const fallback = this.isEditMode
            ? 'Unable to update vendor. Please try again.'
            : 'Unable to create vendor. Please try again.';
          this.errorMessage = fallback;
          this.toastr.error(fallback);
          this.cdr.detectChanges();
        }
      });
  }

  private loadVendor(id: number): void {
    this.isLoadingDetails = true;
    this.errorMessage = undefined;

    this.vendorService
      .fetchVendorById(id)
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            this.autoGenerateVendorId = false;
            this.vendor = {
              ...this.vendor,
              vendorId: response.data.vendorId ?? this.vendor.vendorId,
              vendorName: response.data.vendorName ?? '',
              taxId: (response.data as any).taxId ?? '',
              address: response.data.address ?? '',
              contactPerson: response.data.contactPerson ?? '',
              email: response.data.email ?? '',
              phone: response.data.phone ?? '',
              paymentTerms: response.data.paymentTerms ?? DEFAULT_PAYMENT_TERM,
              rating: String(response.data.rating ?? ''),
              active: response.data.active ?? true
            };
          } else {
            this.errorMessage = response.message ?? 'Unable to load vendor.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load vendor.';
          this.cdr.detectChanges();
        }
      });
  }

}
