import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Company, CompanyPayload, CompanyService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { CompanySetupService } from '../../services/company-setup.service';
import { CompanyContextService } from '../../services/company-context.service';

type CompanyTab = 'basic' | 'address';

@Component({
  selector: 'app-create-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-company.html',
  styleUrls: ['./create-company.css']
})
export class CreateCompanyComponent implements OnInit {
  company = {
    companyLegalName: '',
    companyTradeName: '',
    companyNumber: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    active: true
  };

  readonly countryOptions = [
    { value: 'US', label: 'US' },
    { value: 'UK', label: 'UK' }
  ];

  activeTab: CompanyTab = 'basic';
  isSubmitting = false;
  isLoadingDetails = false;
  isEditMode = false;
  editCompanyId?: number;
  errorMessage?: string;
  isSetupRequiredMode = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private companySetupService: CompanySetupService,
    private companyContext: CompanyContextService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isSetupRequiredMode = this.companySetupService.isSetupRequired();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const companyId = Number(idParam);
    if (Number.isNaN(companyId)) {
      this.errorMessage = 'Invalid company identifier.';
      return;
    }

    this.isEditMode = true;
    this.editCompanyId = companyId;
    this.loadCompany(companyId);
  }

  onCancel(): void {
    if (this.isSetupRequiredMode) {
      this.router.navigate(['/company/create']);
      return;
    }
    this.router.navigate(['/company']);
  }

  onBackToBasic(): void {
    this.activeTab = 'basic';
  }

  onNextToAddress(form: NgForm): void {
    this.markControlsTouched(form, ['companyNumber', 'companyLegalName', 'companyTradeName']);

    if (this.hasBasicInfoErrors(form)) {
      return;
    }

    this.activeTab = 'address';
  }

  onSubmit(form: NgForm): void {
    if (this.isSubmitting || this.isLoadingDetails) {
      return;
    }

    this.markControlsTouched(form, [
      'companyNumber',
      'companyLegalName',
      'companyTradeName',
      'address',
      'city',
      'country',
      'postalCode'
    ]);

    if (!form.valid) {
      this.activeTab = this.hasBasicInfoErrors(form) ? 'basic' : 'address';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;

    const payload: CompanyPayload = {
      companyLegalName: this.company.companyLegalName,
      companyTradeName: this.company.companyTradeName,
      companyNumber: this.company.companyNumber,
      address: this.company.address,
      city: this.company.city,
      country: this.company.country,
      postalCode: this.company.postalCode,
      active: true
    };

    const userId = Number(localStorage.getItem('userId'));
    if (Number.isFinite(userId) && userId > 0) {
      payload.userId = userId;
    }

    const request$ = this.isEditMode && this.editCompanyId
      ? this.companyService.updateCompany(this.editCompanyId, payload)
      : this.companyService.createCompany(payload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.syncCompanyCache(response);
          const createdOrUpdatedId = this.extractCompanyId(response);
          if (createdOrUpdatedId !== null && Number.isFinite(createdOrUpdatedId) && createdOrUpdatedId > 0) {
            this.companyContext.setSelectedCompanyId(createdOrUpdatedId);
          }
          this.companyContext.notifyCompaniesUpdated();
          this.companySetupService.markSetupComplete();
          this.toastr.success(this.isEditMode ? 'Company updated successfully' : 'Company created successfully');
          this.router.navigate([this.isSetupRequiredMode ? '/dashboard' : '/company']);
        },
        error: (error) => {
          const fallback = this.isEditMode
            ? 'Unable to update company. Please try again.'
            : 'Unable to create company. Please try again.';
          const backendMessage = String(error?.error?.message ?? '').trim();
          const message = backendMessage || fallback;
          this.errorMessage = message;
          this.toastr.error(message);
          this.cdr.detectChanges();
        }
      });
  }

  private extractCompanyId(response: any): number | null {
    const candidate =
      response?.data?.id ??
      response?.data?.companyId ??
      response?.id ??
      response?.companyId;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private syncCompanyCache(response: any): void {
    const payloadCompany = response?.data;
    if (!payloadCompany || typeof payloadCompany !== 'object') {
      return;
    }

    const normalizedId = Number(payloadCompany.id ?? (payloadCompany as any).companyId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return;
    }

    const current = this.companyContext.getCompanies();
    const filtered = current.filter((company) => {
      const id = Number(company?.id ?? (company as any)?.companyId);
      return !Number.isFinite(id) || id !== normalizedId;
    });

    this.companyContext.setCompanies([{ ...(payloadCompany as Company), id: normalizedId }, ...filtered]);
  }

  signOut(): void {
    const token = localStorage.getItem('authToken') || '';
    this.authService.logout(token).subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  onCompanyNumberInput(value: string): void {
    this.company.companyNumber = value.replace(/\D/g, '');
  }

  onPostalCodeInput(value: string): void {
    this.company.postalCode = value.replace(/\D/g, '').slice(0, 6);
  }

  isControlInvalid(form: NgForm, name: string): boolean {
    const control = form.controls[name];
    return Boolean(control?.invalid && control?.touched);
  }

  private hasBasicInfoErrors(form: NgForm): boolean {
    return ['companyNumber', 'companyLegalName', 'companyTradeName'].some(name => form.controls[name]?.invalid);
  }

  private markControlsTouched(form: NgForm, names: string[]): void {
    names.forEach(name => form.controls[name]?.markAsTouched());
  }

  private loadCompany(id: number): void {
    this.isLoadingDetails = true;
    this.errorMessage = undefined;

    this.companyService
      .fetchCompanyById(id)
      .pipe(
        finalize(() => {
          this.isLoadingDetails = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          if (!response.data) {
            this.errorMessage = response.message ?? 'Unable to load company.';
            return;
          }

          this.company = {
            companyLegalName: response.data.companyLegalName ?? '',
            companyTradeName: response.data.companyTradeName ?? '',
            companyNumber: (response.data.companyNumber ?? '').replace(/\D/g, ''),
            address: response.data.address ?? '',
            city: response.data.city ?? '',
            country: (response.data.country ?? '').toUpperCase(),
            postalCode: (response.data.postalCode ?? '').replace(/\D/g, '').slice(0, 6),
            active: response.data.active ?? true
          };
        },
        error: () => {
          this.errorMessage = 'Unable to load company.';
          this.cdr.detectChanges();
        }
      });
  }

  private finishLogout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('signupUserId');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('mfaEnabled');
    localStorage.removeItem('mfa_token');
    localStorage.removeItem('emailOtpVerified');
    localStorage.removeItem('authenticatorVerified');
    localStorage.removeItem('passwordExpired');
    localStorage.removeItem('daysUntilPasswordExpiry');
    localStorage.removeItem('userId');
    this.companySetupService.clear();
    this.companyContext.clear();
    this.permissionService.clear();
    this.router.navigate(['/login']);
  }
}

