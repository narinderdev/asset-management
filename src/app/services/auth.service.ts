import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  token?: string;
  data?: {
    token?: string;
    [key: string]: unknown;
  };
}

export interface ApiResponse<T = unknown> {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<LoginResponse>(this.apiUrl, payload, { headers });
  }

  logout(token?: string): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    return this.http.post<ApiResponse>(`${this.apiUrl}/logout`, {}, { headers });
  }
}
