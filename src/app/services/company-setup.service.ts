import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const COMPANY_SETUP_REQUIRED_KEY = 'companySetupRequired';

@Injectable({
  providedIn: 'root'
})
export class CompanySetupService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setFromLoginResponse(response: any): void {
    if (!this.isBrowser) {
      return;
    }

    const companies = response?.data?.companies;
    const isCompanySetup = response?.data?.isCompanySetup;
    const setupRequired = Array.isArray(companies) && companies.length === 0 && isCompanySetup === false;

    localStorage.setItem(COMPANY_SETUP_REQUIRED_KEY, String(setupRequired));
  }

  isSetupRequired(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    return localStorage.getItem(COMPANY_SETUP_REQUIRED_KEY) === 'true';
  }

  markSetupComplete(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(COMPANY_SETUP_REQUIRED_KEY, 'false');
  }

  clear(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(COMPANY_SETUP_REQUIRED_KEY);
  }
}
