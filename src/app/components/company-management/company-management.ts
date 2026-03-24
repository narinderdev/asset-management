import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Company, CompanyService } from '../../services/company.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { Loader } from '../loader/loader';

interface CompanyRow {
  id?: number;
  companyNumber: string;
  companyLegalName: string;
  companyTradeName: string;
  city: string;
  country: string;
  active: boolean;
}

@Component({
  selector: 'app-company-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent, Loader],
  templateUrl: './company-management.html',
  styleUrls: ['./company-management.css']
})
export class CompanyManagementComponent implements OnInit {
  companies: CompanyRow[] = [];
  totalCompanies = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  showEmptyState = false;

  isDeleteModalOpen = false;
  companyToDelete?: CompanyRow;
  isDeleting = false;

  constructor(
    private router: Router,
    private companyService: CompanyService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  private loadCompanies(): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;
    this.showEmptyState = false;
    this.companies = [];

    this.companyService.fetchCompanies(this.currentPage, this.itemsPerPage).subscribe({
      next: response => {
        this.zone.run(() => {
          try {
            const content = response.data?.content ?? [];
            this.companies = content.map(company => this.mapCompany(company));
            this.totalCompanies = response.data?.totalElements ?? this.companies.length;
            this.currentPage = response.data?.page ?? this.currentPage;
            this.itemsPerPage = response.data?.size || this.itemsPerPage;
            this.showEmptyState = this.companies.length === 0;
          } finally {
            this.isLoading = false;
            this.hasLoaded = true;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.zone.run(() => {
          this.companies = [];
          this.totalCompanies = 0;
          this.showEmptyState = true;
          this.errorMessage = 'Unable to load companies right now. Please try again later.';
          this.toastr.error(this.errorMessage);
          this.isLoading = false;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private mapCompany(data: Company): CompanyRow {
    return {
      id: data.id,
      companyNumber: data.companyNumber ?? '-',
      companyLegalName: data.companyLegalName ?? '-',
      companyTradeName: data.companyTradeName ?? '-',
      city: data.city ?? '-',
      country: data.country ?? '-',
      active: data.active ?? false
    };
  }

  addCompany(): void {
    this.router.navigate(['/company/create']);
  }

  viewCompany(company: CompanyRow): void {
    if (!company.id) {
      return;
    }
    this.router.navigate(['/company/view', company.id]);
  }

  editCompany(company: CompanyRow): void {
    if (!company.id) {
      return;
    }
    this.router.navigate(['/company/edit', company.id]);
  }

  openDeleteModal(company: CompanyRow): void {
    this.companyToDelete = company;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.companyToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDelete(): void {
    if (!this.companyToDelete?.id || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.companyService
      .deleteCompany(this.companyToDelete.id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.closeDeleteModal();
          this.loadCompanies();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => this.toastr.success('Company deleted successfully.'),
        error: () => this.toastr.error('Unable to delete company. Please try again.')
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadCompanies();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadCompanies();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCompanies / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalCompanies) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalCompanies) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalCompanies);
  }
}

