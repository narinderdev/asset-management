import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CompanySetupService } from '../services/company-setup.service';

const EMAIL_OTP_VERIFIED_KEY = 'emailOtpVerified';
const AUTHENTICATOR_VERIFIED_KEY = 'authenticatorVerified';
const MFA_ENABLED_KEY = 'mfaEnabled';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private readonly isBrowser: boolean;

  constructor(
    private router: Router,
    private companySetupService: CompanySetupService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private isLoggedIn(): boolean {
    if (!this.isBrowser) {
      // On the server we cannot read localStorage; allow navigation and let the browser guard run.
      return true;
    }
    return !!localStorage.getItem('authToken');
  }

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  private redirectToVerifyAccount(): UrlTree {
    const email = this.isBrowser ? String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase() : '';
    return this.router.createUrlTree(['/verify-account'], {
      queryParams: email ? { email } : undefined
    });
  }

  private redirectToVerifyAuthenticator(): UrlTree {
    return this.router.parseUrl('/verify-authenticator');
  }

  private isEmailOtpVerified(): boolean {
    if (!this.isBrowser) {
      return true;
    }
    return localStorage.getItem(EMAIL_OTP_VERIFIED_KEY) === 'true';
  }

  private isAuthenticatorVerified(): boolean {
    if (!this.isBrowser) {
      return true;
    }
    const isMfaEnabled = localStorage.getItem(MFA_ENABLED_KEY) === 'true';
    if (!isMfaEnabled) {
      return true;
    }
    return localStorage.getItem(AUTHENTICATOR_VERIFIED_KEY) === 'true';
  }

  private canAccessExpiredPasswordFlow(url: string): boolean {
    if (!this.isBrowser) {
      return true;
    }
    const isChangePasswordRoute = url.startsWith('/change-password');
    if (!isChangePasswordRoute) {
      return false;
    }
    return localStorage.getItem('passwordExpired') === 'true' && !!localStorage.getItem('loginEmail');
  }

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.isBrowser) {
      return true;
    }
    if (this.isLoggedIn()) {
      if (!this.isEmailOtpVerified()) {
        return this.redirectToVerifyAccount();
      }
      if (!this.isAuthenticatorVerified()) {
        return this.redirectToVerifyAuthenticator();
      }
      if (this.companySetupService.isSetupRequired() && !state.url.startsWith('/company/create')) {
        return this.router.parseUrl('/company/create');
      }
      return true;
    }
    if (this.canAccessExpiredPasswordFlow(state.url)) {
      return true;
    }
    return this.redirectToLogin();
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.canActivate(route, state);
  }
}

