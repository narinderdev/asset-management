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
export type RolesResponse = ApiResponse<Role[] | { content?: Role[] }>;

export interface Permission {
  action: string;
  code: string;
  description: string;
  id: number;
  label: string;
  module: string;
}

export interface PermissionModule {
  module: string;
  permissions: Permission[];
}

export type PermissionsResponse = ApiResponse<PermissionModule[]> | PermissionModule[];

export interface CreateRolePayload {
  name: string;
  description: string;
  permissionCodes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/api/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/api/permissions`;
  private readonly headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true'
  });

  constructor(private http: HttpClient) {}

  getRoles(): Observable<RolesResponse> {
    return this.http.get<RolesResponse>(this.apiUrl, { headers: this.headers });
  }

  getPermissions(): Observable<PermissionsResponse> {
    return this.http.get<PermissionsResponse>(this.permissionsUrl, {
      headers: this.headers
    });
  }

  createRoles(payload: CreateRolePayload): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(this.apiUrl, payload, { headers: this.headers });
  }
}
