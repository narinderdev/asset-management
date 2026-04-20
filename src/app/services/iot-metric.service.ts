import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IotMetric {
  id?: number;
  metricCode?: string;
  metricName?: string;
  unit?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IotMetricsListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: IotMetric[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface IotMetricDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: IotMetric;
}

export interface IotMetricsQueryParams {
  page: number;
  size: number;
  sort?: string[];
}

export interface IotMetricCreatePayload {
  metricCode: string;
  metricName: string;
  unit?: string;
  description?: string;
  active?: boolean;
}

export interface IotMetricUpdatePayload {
  metricCode?: string;
  metricName?: string;
  unit?: string;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class IotMetricService {
  private readonly apiUrl = `${environment.apiUrl}/api/iot/metrics`;

  constructor(private readonly http: HttpClient) {}

  fetchMetrics(query: IotMetricsQueryParams): Observable<IotMetricsListResponse> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));

    (query.sort ?? []).forEach(sortValue => {
      params = params.append('sort', sortValue);
    });

    return this.http.get<IotMetricsListResponse>(this.apiUrl, {
      params,
      headers: this.getHeaders()
    });
  }

  fetchMetricById(id: number | string): Observable<IotMetricDetailResponse> {
    return this.http.get<IotMetricDetailResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createMetric(payload: IotMetricCreatePayload): Observable<IotMetricDetailResponse> {
    return this.http.post<IotMetricDetailResponse>(this.apiUrl, payload, {
      headers: this.getHeaders()
    });
  }

  updateMetric(id: number | string, payload: IotMetricUpdatePayload): Observable<IotMetricDetailResponse> {
    return this.http.patch<IotMetricDetailResponse>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }
}
