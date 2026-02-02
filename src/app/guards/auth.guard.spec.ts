import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const makeRouter = () => ({
    parseUrl: vi.fn((url: string) => ({ toString: () => url } as UrlTree))
  });

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
    const guard = TestBed.inject(AuthGuard);
    const result = guard.canActivate();
    expect(result).toBe(true);
  });

  it('redirects to /login when no token', () => {
    const router = TestBed.inject(Router) as any;
    const guard = TestBed.inject(AuthGuard);
    const result = guard.canActivate();
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
    expect((result as UrlTree).toString()).toBe('/login');
  });
});
