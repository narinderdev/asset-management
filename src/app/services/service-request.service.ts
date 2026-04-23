import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceRequestsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    size?: number;
    number?: number;
    content?: ApiServiceRequest[];
  };
}

interface ApiServiceRequest {
  id?: string;
  requestId?: string;
  requestDate?: string;
  requesterName?: string;
  shortTitle?: string;
  maintenanceType?: string;
  priority?: string;
  status?: string;
  department?: string;
  maintenanceTeam?: string;
}

interface ApiServiceRequestDetail extends ApiServiceRequest {
  description?: string;
  assetId?: string;
  assetName?: string;
  assignedTechnician?: string;
  scheduledStart?: string;
  targetCompletionDate?: string;
  dueDate?: string;
  attachments?: Array<{ name?: string; url?: string }>;
  notes?: string;
  workOrderId?: string;
  department?: string;
  maintenanceTeam?: string;
  assetDbId?: number;
  attachmentUrl?: string;
  location?: string;
  preferredDate?: string;
  preferredDateTime?: string;
  preferredTechnicianId?: number;
  preferredTeamId?: number;
  preferredTime?: string;
  problemDescription?: string;
  requesterContact?: string;
  safetyRisk?: boolean;
}

export interface ServiceRequestCreatePayload {
  requestId?: string;
  requesterName: string;
  requesterContact?: string;
  department?: string;
  assetId?: number;
  location?: string;
  maintenanceType?: string;
  priority?: string;
  shortTitle: string;
  problemDescription: string;
  preferredStartDate?: string;
  preferredStartTime?: string;
  preferredEndDate?: string;
  preferredEndTime?: string;
  preferredTechnicianId?: number;
  preferredTeamId?: number;
  safetyRisk?: boolean;
  attachmentUrl?: string;
}

export interface ServiceRequestDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiServiceRequestDetail;
}

export interface VoiceAiConversationMessage {
  speaker?: string;
  message?: string;
}

export interface VoiceAiIntakeTranscript {
  id?: number;
  externalCallId?: string;
  intent?: string;
  outcome?: string;
  requesterName?: string;
  requesterPhoneNumber?: string;
  shortTitle?: string;
  transcript?: string;
  conversation?: VoiceAiConversationMessage[] | string | Record<string, unknown> | null;
  serviceRequestDbId?: number;
  serviceRequestId?: string;
  serviceRequestLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoiceAiIntakeTranscriptListResponse {
  success?: boolean;
  status?: number;
  message?: string;
  data?: {
    content?: VoiceAiIntakeTranscript[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  private readonly apiUrl = `${environment.apiUrl}/api/service-requests`;
  private readonly voiceAiApiUrl = `${environment.apiUrl}/api/voice-ai/intakes/transcripts`;

  constructor(private http: HttpClient) {}

  fetchRequests(page: number, size: number): Observable<ServiceRequestsApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<ServiceRequestsApiResponse>(this.apiUrl, { params, headers });
  }

  fetchRequestById(id: string): Observable<ServiceRequestDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<ServiceRequestDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  createRequest(payload: ServiceRequestCreatePayload): Observable<ServiceRequestDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<ServiceRequestDetailResponse>(this.apiUrl, payload, { headers });
  }

  updateRequest(id: string, payload: ServiceRequestCreatePayload): Observable<ServiceRequestDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch<ServiceRequestDetailResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  deleteRequest(id: string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  convertToWorkOrder(id: string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(`${this.apiUrl}/${id}/convert-to-wo`, null, { headers });
  }

  approveRequest(id: string, approvedBy: string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(`${this.apiUrl}/${id}/approve`, { approvedBy }, { headers });
  }

  rejectRequest(id: string, reason: string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, { reason }, { headers });
  }

  fetchVoiceAiIntakeTranscripts(): Observable<VoiceAiIntakeTranscriptListResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<VoiceAiIntakeTranscriptListResponse>(this.voiceAiApiUrl, { headers });
  }
}
