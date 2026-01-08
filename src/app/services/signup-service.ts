import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface SetPasswordPayload {
  email: string;
  password: string;
}

export interface SignupResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SignupService {
  private readonly apiUrl = `${environment.apiUrl}/auth/signup`;

  constructor(private http: HttpClient) {}

  signup(payload: SignupPayload): Observable<SignupResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<SignupResponse>(this.apiUrl, payload, { headers });
  }

  verifyOtp(payload: VerifyOtpPayload): Observable<SignupResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<SignupResponse>(`${this.apiUrl}/verify`, payload, { headers });
  }

  setPassword(payload: SetPasswordPayload): Observable<SignupResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<SignupResponse>(`${this.apiUrl}/set-password`, payload, { headers });
  }
}
