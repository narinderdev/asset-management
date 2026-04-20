import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { CompanyContextService } from '../services/company-context.service';
import { Company, CompanyService } from '../services/company.service';

@Injectable()
export class CompanyIdInterceptor implements HttpInterceptor {
  private readonly isBrowser: boolean;
  private bootstrapCompanySelection$?: Observable<number | null>;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly companyContext: CompanyContextService,
    private readonly companyService: CompanyService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (
      !this.isBrowser ||
      this.isAuthRequest(req.url) ||
      this.isTelemetryIngestRequest(req.url) ||
      this.isCompanyCreateRequest(req) ||
      this.isCompanyListRequest(req) ||
      req.params.has('companyId')
    ) {
      return next.handle(req);
    }

    const companyId = this.companyContext.getSelectedCompanyId();
    if (companyId !== null) {
      const requestWithCompanyId = req.clone({
        params: req.params.set('companyId', String(companyId))
      });

      return next.handle(requestWithCompanyId);
    }

    return this.ensureCompanySelection().pipe(
      switchMap((resolvedCompanyId) => {
        if (resolvedCompanyId === null) {
          return next.handle(req);
        }
        const requestWithCompanyId = req.clone({
          params: req.params.set('companyId', String(resolvedCompanyId))
        });
        return next.handle(requestWithCompanyId);
      })
    );
  }

  private isAuthRequest(url: string): boolean {
    const value = (url || '').toLowerCase();
    return value.includes('/auth') || value.includes('/users/change-password');
  }

  private isTelemetryIngestRequest(url: string): boolean {
    const value = (url || '').toLowerCase();
    return /\/iot\/v1\/telemetry(?:\?|$)/.test(value);
  }

  private isCompanyListRequest(req: HttpRequest<unknown>): boolean {
    const value = (req.url || '').toLowerCase();
    return req.method.toUpperCase() === 'GET' && /\/api\/companies(?:\/user\/[^/?#]+|\/[^/?#]+)?(?:\?|$)/.test(value);
  }

  private isCompanyCreateRequest(req: HttpRequest<unknown>): boolean {
    const value = (req.url || '').toLowerCase();
    return req.method.toUpperCase() === 'POST' && /\/api\/companies(?:\?|$)/.test(value);
  }

  private ensureCompanySelection(): Observable<number | null> {
    const current = this.companyContext.getSelectedCompanyId();
    if (current !== null) {
      return of(current);
    }

    if (this.bootstrapCompanySelection$) {
      return this.bootstrapCompanySelection$;
    }

    this.bootstrapCompanySelection$ = this.companyService
      .fetchCompanies(0, 1000, ['companyLegalName,asc'])
      .pipe(
        map((response) => this.extractCompanies(response)),
        tap((companies) => this.companyContext.initializeFromCompanies(companies)),
        map(() => this.companyContext.getSelectedCompanyId()),
        catchError(() => of(null)),
        finalize(() => {
          this.bootstrapCompanySelection$ = undefined;
        }),
        shareReplay(1)
      );

    return this.bootstrapCompanySelection$;
  }

  private extractCompanies(response: any): Company[] {
    if (Array.isArray(response?.data?.content)) {
      return response.data.content as Company[];
    }
    if (Array.isArray(response?.data?.companies)) {
      return response.data.companies as Company[];
    }
    if (Array.isArray(response?.data)) {
      return response.data as Company[];
    }
    if (Array.isArray(response?.content)) {
      return response.content as Company[];
    }
    if (response?.data && typeof response.data === 'object') {
      return [response.data as Company];
    }
    return [];
  }
}
