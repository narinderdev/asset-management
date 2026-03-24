import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) {}

  fetchCompanies(page: number, size: number, sort: string[] = []): Observable<CompaniesApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    sort.forEach(sortValue => {
      params = params.append('sort', sortValue);
    });

    return this.http.get<CompaniesApiResponse>(this.apiUrl, { params, headers: this.headers });
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
}
