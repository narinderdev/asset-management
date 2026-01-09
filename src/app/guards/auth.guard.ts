import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private readonly isBrowser: boolean;

  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private isLoggedIn(): boolean {
    if (!this.isBrowser) {
      // On the server we cannot read localStorage; allow navigation and let the browser guard run.
      return true;
    }
    return !!localStorage.getItem('authToken');
  }

  private hasSignupUser(): boolean {
    if (!this.isBrowser) {
      return true;
    }
    return !!localStorage.getItem('signupUserId');
  }

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  canActivate(): boolean | UrlTree {
    if (!this.isBrowser) {
      return true;
    }
    if (this.isLoggedIn() || this.hasSignupUser()) {
      return true;
    }
    return this.redirectToLogin();
  }

  canActivateChild(): boolean | UrlTree {
    return this.canActivate();
  }
}
