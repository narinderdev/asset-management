import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role } from '../models/company-users.model';

interface ApiResponse<T = unknown> {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: T;
}

export type PermissionsResponse = ApiResponse<string[]> | string[];

export interface CreateRolePayload {
  name: string;
  description: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/api/roles`;
  private readonly headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true'
  });

  constructor(private http: HttpClient) {}

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.apiUrl, { headers: this.headers });
  }

  getPermissions(): Observable<PermissionsResponse> {
    return this.http.get<PermissionsResponse>(`${this.apiUrl}/permissions`, {
      headers: this.headers
    });
  }

  createRoles(payload: CreateRolePayload): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(this.apiUrl, payload, { headers: this.headers });
  }
}
