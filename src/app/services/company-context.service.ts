import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Company } from './company.service';

const SELECTED_COMPANY_ID_KEY = 'selectedCompanyId';
const COMPANIES_CACHE_KEY = 'companiesCache';

type InitializeCompanyOptions = {
  preserveCurrentSelection?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class CompanyContextService {
  private readonly isBrowser: boolean;
  private readonly selectedCompanyIdSubject: BehaviorSubject<number | null>;
  private readonly companiesSubject: BehaviorSubject<Company[]>;
  private readonly companiesUpdatedSubject = new Subject<void>();
  readonly selectedCompanyId$: Observable<number | null>;
  readonly companies$: Observable<Company[]>;
  readonly companiesUpdated$: Observable<void>;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.selectedCompanyIdSubject = new BehaviorSubject<number | null>(this.readStoredCompanyId());
    this.companiesSubject = new BehaviorSubject<Company[]>(this.readStoredCompanies());
    this.selectedCompanyId$ = this.selectedCompanyIdSubject.asObservable();
    this.companies$ = this.companiesSubject.asObservable();
    this.companiesUpdated$ = this.companiesUpdatedSubject.asObservable();
  }

  getSelectedCompanyId(): number | null {
    return this.selectedCompanyIdSubject.value;
  }

  getCompanies(): Company[] {
    return this.companiesSubject.value;
  }

  setCompanies(companies: Company[]): void {
    this.companiesSubject.next(companies);

    if (!this.isBrowser) {
      return;
    }

    if (!companies.length) {
      localStorage.removeItem(COMPANIES_CACHE_KEY);
      return;
    }

    localStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(companies));
  }

  setSelectedCompanyId(companyId: number | null): void {
    this.selectedCompanyIdSubject.next(companyId);

    if (!this.isBrowser) {
      return;
    }

    if (companyId === null) {
      localStorage.removeItem(SELECTED_COMPANY_ID_KEY);
      return;
    }

    localStorage.setItem(SELECTED_COMPANY_ID_KEY, String(companyId));
  }

  initializeFromCompanies(companies: Company[], options?: InitializeCompanyOptions): number | null {
    const validCompanies = companies.filter((company) => this.getCompanyId(company) !== null);
    this.setCompanies(validCompanies);

    if (!validCompanies.length) {
      this.setSelectedCompanyId(null);
      return null;
    }

    const currentId = this.getSelectedCompanyId();
    const existing = validCompanies.find((company) => this.getCompanyId(company) === currentId);
    const existingId = existing ? this.getCompanyId(existing) : null;
    if (existingId !== null) {
      this.setSelectedCompanyId(existingId);
      return existingId;
    }

    if (options?.preserveCurrentSelection && currentId !== null) {
      this.setSelectedCompanyId(currentId);
      return currentId;
    }

    const firstId = this.getCompanyId(validCompanies[0]);
    if (firstId === null) {
      this.setSelectedCompanyId(null);
      return null;
    }

    this.setSelectedCompanyId(firstId);
    return firstId;
  }

  clear(): void {
    this.setCompanies([]);
    this.setSelectedCompanyId(null);
  }

  notifyCompaniesUpdated(): void {
    this.companiesUpdatedSubject.next();
  }

  private readStoredCompanyId(): number | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(SELECTED_COMPANY_ID_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private readStoredCompanies(): Company[] {
    if (!this.isBrowser) {
      return [];
    }

    const raw = localStorage.getItem(COMPANIES_CACHE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as Company[];
    } catch {
      return [];
    }
  }

  private getCompanyId(company: Company): number | null {
    const rawId = company?.id ?? (company as any)?.companyId;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
