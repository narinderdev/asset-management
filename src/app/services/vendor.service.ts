import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface VendorsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    content?: ApiVendor[];
  };
}

interface ApiVendor {
  vendorId?: string;
  vendorName?: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  rating?: number;
  status?: string;
  active?: boolean;
  id?: number;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVendorPayload {
  vendorId?: string;
  vendorName: string;
  taxId?: string;
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
  paymentTerms: string;
  rating: number;
  active: boolean;
}

export interface VendorCreateResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiVendor;
}

export interface VendorDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiVendor;
}

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private readonly apiUrl = `${environment.apiUrl}/api/vendors`;

  constructor(private http: HttpClient) {}

  fetchVendors(page: number, size: number, includeInactive = false): Observable<VendorsApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }

    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<VendorsApiResponse>(this.apiUrl, { params, headers });
  }

  createVendor(payload: CreateVendorPayload): Observable<VendorCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<VendorCreateResponse>(this.apiUrl, payload, { headers });
  }

  updateVendor(id: number, payload: CreateVendorPayload): Observable<VendorCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch<VendorCreateResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  fetchVendorById(id: number): Observable<VendorDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<VendorDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  deleteVendor(id: number): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  approveVendor(id: number): Observable<VendorCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<VendorCreateResponse>(`${this.apiUrl}/${id}/approve`, {}, { headers });
  }

  rejectVendor(id: number, comment: string): Observable<VendorCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<VendorCreateResponse>(`${this.apiUrl}/${id}/reject`, { comment }, { headers });
  }
}
