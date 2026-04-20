import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

interface CompaniesApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: Company[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface Company {
  id?: number;
  companyLegalName?: string;
  companyTradeName?: string;
  companyNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyPayload {
  companyLegalName: string;
  companyTradeName: string;
  companyNumber: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  active: boolean;
  userId?: number;
}

export interface CompanyResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: Company;
}

export interface CompanyDeleteResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly apiUrl = `${environment.apiUrl}/api/companies`;
  private readonly isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  fetchCompanies(page: number, size: number, sort: string[] = []): Observable<CompaniesApiResponse> {
    const userId = this.getUserId();
    if (userId === null) {
      return of({
        statusCode: 0,
        status: 'OK',
        message: 'No user context available.',
        data: {
          content: [],
          page,
          size,
          totalElements: 0,
          totalPages: 0
        }
      });
    }

    const url = `${this.apiUrl}/user/${userId}`;
    return this.http.get<CompaniesApiResponse>(url, { headers: this.headers });
  }

  createCompany(payload: CompanyPayload): Observable<CompanyResponse> {
    return this.http.post<CompanyResponse>(this.apiUrl, payload, { headers: this.headers });
  }

  fetchCompanyById(id: number): Observable<CompanyResponse> {
    return this.http.get<CompanyResponse>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  updateCompany(id: number, payload: CompanyPayload): Observable<CompanyResponse> {
    return this.http.patch<CompanyResponse>(`${this.apiUrl}/${id}`, payload, { headers: this.headers });
  }

  deleteCompany(id: number): Observable<CompanyDeleteResponse> {
    return this.http.delete<CompanyDeleteResponse>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }

  private getUserId(): number | null {
    if (!this.isBrowser) {
      return null;
    }

    const rawUserId = localStorage.getItem('userId');
    if (!rawUserId) {
      return null;
    }
    const parsed = Number(rawUserId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
