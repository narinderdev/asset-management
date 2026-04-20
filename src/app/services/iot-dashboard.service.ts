import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type IotDashboardSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IotDashboardIssueStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'SUPPRESSED' | 'RESOLVED' | 'AUTO_RESOLVED';

export interface IotDashboardRecentIssue {
  id?: number;
  deviceId?: number;
  deviceUid?: string;
  assetId?: number;
  assetName?: string;
  ruleId?: number;
  metricId?: number;
  metricCode?: string;
  latestValue?: number;
  thresholdValue?: number;
  severity?: IotDashboardSeverity;
  anomalyType?: string;
  status?: IotDashboardIssueStatus;
  location?: string;
  message?: string;
  linkedServiceRequestDbId?: number;
  linkedServiceRequestId?: string;
  occurredAt?: string;
  lastTriggeredAt?: string;
  lastNormalAt?: string;
  healthyStreak?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  suppressedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IotDashboardData {
  totalDevices?: number;
  onlineDevices?: number;
  offlineDevices?: number;
  activeAlerts?: number;
  criticalAlerts?: number;
  recentIssues?: IotDashboardRecentIssue[];
}

export interface IotDashboardApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: IotDashboardData;
}

@Injectable({ providedIn: 'root' })
export class IotDashboardService {
  private readonly dashboardUrl = `${environment.apiUrl}/api/iot/dashboard`;

  constructor(private readonly http: HttpClient) {}

  fetchDashboard(): Observable<IotDashboardApiResponse> {
    return this.http.get<IotDashboardApiResponse>(this.dashboardUrl, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
