import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type IotAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IotAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'SUPPRESSED' | 'RESOLVED' | 'AUTO_RESOLVED';

export interface IotAlert {
  id?: number;
  deviceId?: number;
  deviceUid?: string;
  deviceName?: string;
  assetId?: number;
  assetName?: string;
  location?: string;
  severity?: IotAlertSeverity;
  status?: IotAlertStatus;
  alertType?: string;
  title?: string;
  message?: string;
  reason?: string;
  createdAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  suppressedUntil?: string;
}

export interface IotAlertsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: IotAlert[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface IotAlertActionPayload {
  reason?: string;
  suppressedUntil?: string;
}

export interface IotAlertActionResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: IotAlert;
}

export interface IotAlertsFilterParams {
  page: number;
  size: number;
  assetId?: number;
  location?: string;
  severity?: IotAlertSeverity | '';
  status?: IotAlertStatus | '';
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class IotAlertService {
  private readonly apiUrl = `${environment.apiUrl}/api/iot/alerts`;

  constructor(private readonly http: HttpClient) {}

  fetchAlerts(filters: IotAlertsFilterParams): Observable<IotAlertsApiResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('size', String(filters.size));

    if (filters.assetId !== undefined) {
      params = params.set('assetId', String(filters.assetId));
    }
    if (filters.location) {
      params = params.set('location', filters.location);
    }
    if (filters.severity) {
      params = params.set('severity', filters.severity);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }

    return this.http.get<IotAlertsApiResponse>(this.apiUrl, {
      params,
      headers: this.getHeaders()
    });
  }

  acknowledgeAlert(id: string | number, payload: IotAlertActionPayload): Observable<IotAlertActionResponse> {
    return this.http.post<IotAlertActionResponse>(`${this.apiUrl}/${id}/ack`, payload, {
      headers: this.getHeaders()
    });
  }

  resolveAlert(id: string | number, payload: IotAlertActionPayload): Observable<IotAlertActionResponse> {
    return this.http.post<IotAlertActionResponse>(`${this.apiUrl}/${id}/resolve`, payload, {
      headers: this.getHeaders()
    });
  }

  suppressAlert(id: string | number, payload: IotAlertActionPayload): Observable<IotAlertActionResponse> {
    return this.http.post<IotAlertActionResponse>(`${this.apiUrl}/${id}/suppress`, payload, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
