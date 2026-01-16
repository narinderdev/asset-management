import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface PmTemplatesApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    content?: ApiPmTemplate[];
  };
}

interface ApiPmTemplate {
  pmId?: string;
  pmName?: string;
  pmType?: string;
  appliesToType?: string;
  frequencyValue?: number;
  timeUnit?: string;
  meterUnit?: string;
  autoGenerateWo?: boolean;
  nextDueDate?: string;
  planStartDate?: string;
  frequencyType?: string;
}

interface ApiPmTemplateDetail extends ApiPmTemplate {
  id?: number;
  assetDbId?: number;
  assetId?: string;
  assetName?: string;
  assetCategory?: string;
  graceDays?: number;
  autoGenerateWo?: boolean;
  leadTimeDays?: number;
  linkedWorkType?: string;
  defaultPriority?: string;
  active?: boolean;
  lastGeneratedDueDate?: string;
  planEndDate?: string;
}

export interface PmTemplateDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiPmTemplateDetail;
}

export interface CreatePmTemplatePayload {
  pmName: string;
  pmId?: string;
  pmType?: string;
  appliesToType?: string;
  assetDbId?: number;
  assetCategory?: string;
  planStartDate?: string;
  planEndDate?: string;
  frequencyType?: string;
  frequencyValue?: number;
  timeUnit?: string;
  meterUnit?: string;
  graceDays?: number;
  autoGenerateWo?: boolean;
  leadTimeDays?: number;
  linkedWorkType?: string;
  defaultPriority?: string;
}

export interface CreatePreventiveMaintenancePayload {
  assetId?: number;
  location?: string;
  title: string;
  workType: string;
  priority: string;
  scheduleType: string;
  leadTimeDays?: number;
  startDate?: string;
  intervalUnit?: string;
  intervalValue?: number;
  meterType?: string;
  meterIntervalValue?: number;
  currentMeterReading?: number;
}

export interface CreatePmTemplateResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiPmTemplate;
 }

interface PreventiveMaintenanceItem {
  id?: number;
  assetId?: number;
  assetName?: string;
  location?: string;
  title?: string;
  workType?: string;
  priority?: string;
  scheduleType?: string;
  leadTimeDays?: number;
  startDate?: string;
  intervalUnit?: string;
  intervalValue?: number;
  meterType?: string;
  meterIntervalValue?: number;
  currentMeterReading?: number;
  nextDueDate?: string;
}

interface PreventiveMaintenanceListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    content?: PreventiveMaintenanceItem[];
  };
}

export interface PreventiveMaintenanceDetail {
  id?: number;
  planCode?: string;
  title?: string;
  assetId?: number;
  assetCode?: string;
  assetName?: string;
  location?: string;
  workType?: string;
  priority?: string;
  scheduleType?: string;
  leadTimeDays?: number;
  startDate?: string;
  intervalUnit?: string;
  intervalValue?: number;
  meterType?: string;
  meterIntervalValue?: number;
  currentMeterReading?: number;
  nextDueDate?: string;
  nextDueMeter?: number;
  lastGeneratedDueDate?: string;
  active?: boolean;
}

export interface PreventiveMaintenanceDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PreventiveMaintenanceDetail;
}

@Injectable({
  providedIn: 'root'
})
export class PmTemplateService {
  private readonly apiUrl = `${environment.apiUrl}/api/pm-templates`;
  private readonly maintenanceApiUrl = `${environment.apiUrl}/api/maintenance/preventive`;

  constructor(private http: HttpClient) {}

  fetchPreventiveMaintenance(page: number, size: number): Observable<PreventiveMaintenanceListResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PreventiveMaintenanceListResponse>(this.maintenanceApiUrl, { params, headers });
  }

  fetchPreventiveMaintenanceById(id: number | string): Observable<PreventiveMaintenanceDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PreventiveMaintenanceDetailResponse>(`${this.maintenanceApiUrl}/${id}`, { headers });
  }

  fetchTemplates(page: number, size: number): Observable<PmTemplatesApiResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PmTemplatesApiResponse>(this.apiUrl, { params, headers });
  }

  createTemplate(payload: CreatePmTemplatePayload): Observable<CreatePmTemplateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<CreatePmTemplateResponse>(this.apiUrl, payload, { headers });
  }

  createPreventiveMaintenance(payload: CreatePreventiveMaintenancePayload): Observable<CreatePmTemplateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<CreatePmTemplateResponse>(this.maintenanceApiUrl, payload, { headers });
  }

  updateTemplate(id: number | string, payload: CreatePmTemplatePayload): Observable<CreatePmTemplateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch<CreatePmTemplateResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  fetchTemplateById(id: number | string): Observable<PmTemplateDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PmTemplateDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  deleteTemplate(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }
}
