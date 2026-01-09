import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isBrowser) {
      return next.handle(req);
    }

    const url = (req.url || '').toLowerCase();
    const isAuthEndpoint =
      url.includes('/auth/signup/verify') || url.endsWith('/auth') || url.includes('/auth/signup');

    if (isAuthEndpoint) {
      return next.handle(req);
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      return next.handle(req);
    }

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.isBrowser && error?.status === 403) {
          localStorage.removeItem('authToken');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
