import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { formatDate } from '@angular/common';

import { VendorService } from '../../services/vendor.service';

interface VendorDetail {
  id?: number;
  vendorId?: string;
  vendorName?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  rating?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-view-vendor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-vendor.html',
  styleUrls: ['./view-vendor.css']
})
export class ViewVendorComponent implements OnInit {
  vendor?: VendorDetail;
  isLoading = true;
  errorMessage?: string;

  constructor(
  private router: Router,
  private route: ActivatedRoute,
  private vendorService: VendorService,
  private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.errorMessage = 'Missing vendor identifier.';
      this.isLoading = false;
      return;
    }

    const vendorId = Number(idParam);
    if (Number.isNaN(vendorId)) {
      this.errorMessage = 'Invalid vendor identifier.';
      this.isLoading = false;
      return;
    }

    this.vendorService
      .fetchVendorById(vendorId)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            this.vendor = response.data;
          } else {
            this.errorMessage = response.message ?? 'Vendor details not available.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load vendor details.';
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/vendor-management']);
  }

  formatDateString(value?: string): string {
    if (!value) {
      return '—';
    }
    return formatDate(value, 'medium', 'en-US');
  }

  formatPaymentTermsLabel(value?: string): string {
    if (!value) {
      return '—';
    }
    return value.replace(/_/g, ' ');
  }
}
