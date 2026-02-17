import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InviteUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  roleIds: number[];
}

export interface ApiResponse<T = unknown> {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: T;
}

export interface SetPasswordPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  email: string;
}

export interface UserListItem {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  roles?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true'
  });

  constructor(private http: HttpClient) {}

  inviteUser(payload: InviteUserPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/invite`, payload, {
      headers: this.headers
    });
  }

  setPassword(payload: SetPasswordPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/set-password`, payload, {
      headers: this.headers
    });
  }

  changePassword(payload: ChangePasswordPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/change-password`, payload, {
      headers: this.headers
    });
  }

  fetchUsers(): Observable<ApiResponse<UserListItem[]>> {
    return this.http.get<ApiResponse<UserListItem[]>>(this.apiUrl, { headers: this.headers });
  }
}
