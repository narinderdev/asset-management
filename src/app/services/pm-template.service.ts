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

export interface UpdatePreventiveMaintenancePayload extends CreatePreventiveMaintenancePayload {
  active?: boolean;
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

interface PredictiveThresholdItem {
  id?: number;
  assetId?: number;
  assetName?: string;
  meterType?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  autoCreateWo?: boolean;
  defaultPriority?: string;
  cooldownHours?: number;
  lastTriggeredSeverity?: string;
  meterReadings?: Array<{
    id?: number;
    meterType?: string;
    readingValue?: number;
    readingTime?: string;
    severity?: string;
    notes?: string;
    createdAt?: string;
  }>;
}

interface PredictiveThresholdListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    content?: PredictiveThresholdItem[];
  };
}

interface EmergencyIncidentItem {
  id?: number;
  workOrderId?: number;
  workOrderNumber?: string;
  assetId?: number;
  assetName?: string;
  location?: string;
  failureDescription?: string;
  failureTime?: string;
  downtimeStart?: string;
  downtimeEnd?: string;
  reporter?: string;
  createdAt?: string;
  updatedAt?: string;
  workOrder?: {
    id?: number;
    workOrderId?: string;
    assetId?: string;
    assetName?: string;
    location?: string;
    workType?: string;
    priority?: string;
    woTitle?: string;
    plannedStartDateTime?: string;
    plannedEndDateTime?: string;
    targetCompletionDate?: string;
    failureDescription?: string;
    failureCause?: string;
    remedyAction?: string;
    downtimeStart?: string;
    downtimeEnd?: string;
    reporter?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

interface EmergencyMaintenanceResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    incidents?: EmergencyIncidentItem[];
    totalElements?: number;
    totalPages?: number;
    size?: number;
  };
}

export interface EmergencyIncidentDetail extends EmergencyIncidentItem {}

export interface EmergencyIncidentDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: EmergencyIncidentDetail;
}

export interface CreateEmergencyMaintenancePayload {
  assetId: number;
  location?: string;
  failureDescription: string;
  failureTime: string;
  reporter?: string;
  sendNotification: boolean;
}

export interface PredictiveThresholdPayload {
  assetId: number;
  meterType: string;
  warningThreshold: number;
  criticalThreshold: number;
  autoCreateWo: boolean;
  defaultPriority: string;
  cooldownHours: number;
}

export interface PredictiveMeterReadingPayload {
  assetId: number;
  meterType: string;
  readingValue: number;
  readingTime: string;
  notes?: string;
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
  private readonly predictiveApiUrl = `${environment.apiUrl}/api/maintenance/predictive/threshold`;
  private readonly predictiveMeterReadingApiUrl = `${environment.apiUrl}/api/maintenance/predictive/meter-reading`;
  private readonly emergencyApiUrl = `${environment.apiUrl}/api/maintenance/emergency`;

  constructor(private http: HttpClient) {}

  fetchPreventiveMaintenance(page: number, size: number): Observable<PreventiveMaintenanceListResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PreventiveMaintenanceListResponse>(this.maintenanceApiUrl, { params, headers });
  }

  fetchPredictiveThresholds(page: number, size: number): Observable<PredictiveThresholdListResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PredictiveThresholdListResponse>(this.predictiveApiUrl, { params, headers });
  }

  fetchPredictiveThresholdById(id: number | string): Observable<PredictiveThresholdItem> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PredictiveThresholdItem>(`${this.predictiveApiUrl}/${id}`, { headers });
  }

  createPredictiveThreshold(payload: PredictiveThresholdPayload): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(this.predictiveApiUrl, payload, { headers });
  }

  createPredictiveMeterReading(payload: PredictiveMeterReadingPayload): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(this.predictiveMeterReadingApiUrl, payload, { headers });
  }

  deletePredictiveThreshold(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.predictiveApiUrl}/${id}`, { headers });
  }

  fetchEmergencyMaintenance(page: number, size: number): Observable<EmergencyMaintenanceResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<EmergencyMaintenanceResponse>(this.emergencyApiUrl, { params, headers });
  }

  fetchEmergencyMaintenanceById(id: number | string): Observable<EmergencyIncidentDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<EmergencyIncidentDetailResponse>(`${this.emergencyApiUrl}/${id}`, { headers });
  }

  createEmergencyMaintenance(payload: CreateEmergencyMaintenancePayload): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(this.emergencyApiUrl, payload, { headers });
  }

  updatePredictiveThreshold(id: number | string, payload: PredictiveThresholdPayload): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.put<void>(`${this.predictiveApiUrl}/${id}`, payload, { headers });
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

  updatePreventiveMaintenance(id: number | string, payload: UpdatePreventiveMaintenancePayload): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch<void>(`${this.maintenanceApiUrl}/${id}`, payload, { headers });
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

  deletePreventiveMaintenance(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.maintenanceApiUrl}/${id}`, { headers });
  }
}
