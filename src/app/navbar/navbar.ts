import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Company, CompanyService } from '../services/company.service';
import { CompanyContextService } from '../services/company-context.service';
import { Loader } from '../components/loader/loader';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  companies: Company[] = [];
  selectedCompanyId: number | null = null;
  isLoadingCompanies = false;

  private readonly destroy$ = new Subject<void>();
  private loadSequence = 0;
  private activeCompanyRequests = 0;

  constructor(
    private readonly companyService: CompanyService,
    private readonly companyContext: CompanyContextService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.companyContext.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyId) => {
        this.selectedCompanyId = companyId;
        // If another flow (e.g. interceptor bootstrap) resolved company selection first,
        // refresh navbar list so the company label/dropdown can render.
        if (companyId !== null && !this.companies.length && !this.isLoadingCompanies) {
          this.loadCompanies();
        }
        this.cdr.detectChanges();
      });

    this.companyContext.companies$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companies) => {
        this.companies = companies;
        this.cdr.detectChanges();
      });

    this.companyContext.companiesUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCompanies(true);
      });

    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCompanyChange(companyId: number | string | null): void {
    const normalized = this.toCompanyId(companyId);
    if (normalized === null) {
      return;
    }

    if (normalized === this.selectedCompanyId) {
      return;
    }

    this.companyContext.setSelectedCompanyId(normalized);
    // Keep app shell mounted and re-initialize only routed content.
    this.router.navigateByUrl(this.router.url, { replaceUrl: true });
  }

  getCompanyLabel(company: Company): string {
    const name = (company.companyLegalName || company.companyTradeName || 'Unnamed Company').trim();
    const number = (company.companyNumber || '').trim();
    return number ? `${name} - ${number}` : name;
  }

  get selectedCompanyLabel(): string {
    if (!this.companies.length) {
      return 'No Company';
    }

    const selected = this.companies.find((company) => this.getCompanyId(company) === this.selectedCompanyId) || this.companies[0];
    return this.getCompanyLabel(selected);
  }

  getCompanyId(company: Company): number | null {
    return this.toCompanyId(company?.id ?? (company as any)?.companyId);
  }

  private loadCompanies(forceRefresh = false): void {
    let hasCachedCompanies = false;
    if (!forceRefresh) {
      const cached = this.companyContext.getCompanies();
      if (cached.length) {
        hasCachedCompanies = true;
        this.companies = cached;
        this.companyContext.initializeFromCompanies(cached, { preserveCurrentSelection: true });
        this.cdr.detectChanges();
      }
    }

    const requestSequence = ++this.loadSequence;
    if (!hasCachedCompanies || forceRefresh) {
      this.startLoading();
    }

    this.companyService.fetchCompanies(0, 1000, ['companyLegalName,asc'])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (!hasCachedCompanies || forceRefresh) {
            this.stopLoading();
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (requestSequence !== this.loadSequence) {
            return;
          }

          const content = this.extractCompanies(response);
          const normalizedCompanies = content.filter((company) => this.getCompanyId(company) !== null);

          // Avoid replacing already-loaded valid data with transient empty responses.
          if (!normalizedCompanies.length && this.companies.length) {
            return;
          }

          this.companies = normalizedCompanies;
          this.companyContext.initializeFromCompanies(this.companies, { preserveCurrentSelection: true });
          this.cdr.detectChanges();
        },
        error: () => {
          if (requestSequence !== this.loadSequence) {
            return;
          }

          // Keep current selection/data on transient failures to prevent UI flicker back to "No Company".
          this.cdr.detectChanges();
        }
      });
  }

  private startLoading(): void {
    this.activeCompanyRequests += 1;
    this.ngZone.run(() => {
      this.isLoadingCompanies = this.activeCompanyRequests > 0;
      this.cdr.detectChanges();
    });
  }

  private stopLoading(): void {
    this.activeCompanyRequests = Math.max(0, this.activeCompanyRequests - 1);
    this.ngZone.run(() => {
      this.isLoadingCompanies = this.activeCompanyRequests > 0;
      this.cdr.detectChanges();
    });
  }

  private extractCompanies(response: any): Company[] {
    if (Array.isArray(response?.data?.content)) {
      return response.data.content as Company[];
    }
    if (Array.isArray(response?.data)) {
      return response.data as Company[];
    }
    if (Array.isArray(response?.data?.companies)) {
      return response.data.companies as Company[];
    }
    if (Array.isArray(response?.data?.data?.content)) {
      return response.data.data.content as Company[];
    }
    if (Array.isArray(response?.content)) {
      return response.content as Company[];
    }
    if (response?.data && typeof response.data === 'object') {
      return [response.data as Company];
    }
    return [];
  }

  private toCompanyId(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
