import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IotDevice {
  id?: number;
  deviceUid?: string;
  deviceName?: string;
  assetId?: number;
  assetName?: string;
  location?: string;
  enabled?: boolean;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IotDevicesApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: IotDevice[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface IotDeviceDetailApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: IotDevice;
}

export interface IotDeviceCreatePayload {
  deviceUid: string;
  deviceName: string;
  assetId?: number;
  location?: string;
  enabled: boolean;
}

export interface IotDeviceUpdatePayload {
  deviceName: string;
  assetId?: number;
  location?: string;
  enabled: boolean;
}

export interface RotateSecretApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    deviceId?: number;
    deviceUid?: string;
    newSecret?: string;
  };
}

export interface IotTelemetryIngestPayload {
  deviceUid: string;
  timestamp: string;
  signature: string;
  nonce?: string;
  body: string;
}

export interface IotTelemetryIngestResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class IotDeviceService {
  private readonly apiUrl = `${environment.apiUrl}/api/iot/devices`;
  private readonly telemetryUrl = `${environment.apiUrl}/iot/v1/telemetry`;

  constructor(private http: HttpClient) {}

  fetchDevices(page: number, size: number): Observable<IotDevicesApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<IotDevicesApiResponse>(this.apiUrl, {
      params,
      headers: this.getHeaders()
    });
  }

  fetchDeviceById(id: string | number): Observable<IotDeviceDetailApiResponse> {
    return this.http.get<IotDeviceDetailApiResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createDevice(payload: IotDeviceCreatePayload): Observable<IotDeviceDetailApiResponse> {
    return this.http.post<IotDeviceDetailApiResponse>(this.apiUrl, payload, {
      headers: this.getHeaders()
    });
  }

  updateDevice(id: string | number, payload: IotDeviceUpdatePayload): Observable<IotDeviceDetailApiResponse> {
    return this.http.patch<IotDeviceDetailApiResponse>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  rotateSecret(id: string | number): Observable<RotateSecretApiResponse> {
    return this.http.post<RotateSecretApiResponse>(`${this.apiUrl}/${id}/rotate-secret`, null, {
      headers: this.getHeaders()
    });
  }

  ingestTelemetry(payload: IotTelemetryIngestPayload): Observable<IotTelemetryIngestResponse> {
    let headers = this.getHeaders()
      .set('Content-Type', 'text/plain')
      .set('X-IoT-Device-Uid', payload.deviceUid)
      .set('X-IoT-Timestamp', payload.timestamp)
      .set('X-IoT-Signature', payload.signature);

    if (payload.nonce?.trim()) {
      headers = headers.set('X-IoT-Nonce', payload.nonce.trim());
    }

    return this.http.post<IotTelemetryIngestResponse>(this.telemetryUrl, payload.body, { headers });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
