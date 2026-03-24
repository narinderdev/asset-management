import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const makeRouter = () => ({
    parseUrl: vi.fn((url: string) => ({ toString: () => url } as UrlTree)),
    createUrlTree: vi.fn((commands: string[], extras?: { queryParams?: Record<string, string> }) => {
      const path = commands.join('/');
      const email = extras?.queryParams?.['email'];
      const query = email ? `?email=${email}` : '';
      return { toString: () => `${path}${query}` } as UrlTree;
    })
  });
  const routeStub = {} as any;
  const stateStub = { url: '/dashboard' } as any;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useFactory: makeRouter },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
  });

  it('allows navigation when auth token exists', () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('emailOtpVerified', 'true');
    localStorage.setItem('authenticatorVerified', 'true');
    const guard = TestBed.inject(AuthGuard);
    const result = guard.canActivate(routeStub, stateStub);
    expect(result).toBe(true);
  });

  it('redirects to /verify-account when otp is not verified', () => {
    const router = TestBed.inject(Router) as any;
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('loginEmail', 'user@example.com');
    const guard = TestBed.inject(AuthGuard);

    const result = guard.canActivate(routeStub, stateStub);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/verify-account'], {
      queryParams: { email: 'user@example.com' }
    });
    expect((result as UrlTree).toString()).toBe('/verify-account?email=user@example.com');
  });

  it('redirects to /login when no token', () => {
    const router = TestBed.inject(Router) as any;
    const guard = TestBed.inject(AuthGuard);
    const result = guard.canActivate(routeStub, stateStub);
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
    expect((result as UrlTree).toString()).toBe('/login');
  });
});
