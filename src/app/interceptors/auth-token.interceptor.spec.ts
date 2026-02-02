import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthTokenInterceptor } from './auth-token.interceptor';

describe('AuthTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const routerMock = { navigate: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('attaches Authorization header when token exists', () => {
    localStorage.setItem('authToken', 'abc123');

    http.post('/any', {}).subscribe();

    const req = httpMock.expectOne('/any');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('navigates to login on 403 response', () => {
    localStorage.setItem('authToken', 'abc123');

    http.post('/forbidden', {}).subscribe({
      next: () => fail('should error'),
      error: () => {
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
      }
    });

    const req = httpMock.expectOne('/forbidden');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
  });
});
