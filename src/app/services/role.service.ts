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
  technicianRole: boolean;
}

export interface PermissionResponseModule {
  module: string;
  permissions: Permission[];
}

export interface SecurityReportByRoleItem {
  role: string;
  objects: Record<string, string[]>;
}

export interface SecurityReportByRoleResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: SecurityReportByRoleItem[];
}

export interface SecurityReportByObjectResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: Record<string, Record<string, string[]>>;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/api/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/api/permissions`;
  private readonly securityReportByRoleUrl = `${environment.apiUrl}/api/reports/security/roles`;
  private readonly securityReportByObjectUrl = `${environment.apiUrl}/api/reports/security/objects`;
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

  getRoleById(id: number | string): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  updateRole(id: number | string, payload: Partial<CreateRolePayload>): Observable<ApiResponse<Role>> {
    return this.http.patch<ApiResponse<Role>>(`${this.apiUrl}/${id}`, payload, { headers: this.headers });
  }

  getSecurityReportByRole(): Observable<SecurityReportByRoleResponse> {
    return this.http.get<SecurityReportByRoleResponse>(this.securityReportByRoleUrl, { headers: this.headers });
  }

  getSecurityReportByObject(): Observable<SecurityReportByObjectResponse> {
    return this.http.get<SecurityReportByObjectResponse>(this.securityReportByObjectUrl, { headers: this.headers });
  }
}
