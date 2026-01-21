import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApproveWorkOrderRequest {
  approvedBy: string;
  estimatedLaborHours: number;
  estimatedMaterialCost: number;
  approvalNotes?: string;
}

export interface PlannedMaterialPayload {
  inventoryItemId: number;
  quantity: number;
  uom: string;
  notes?: string;
}

export interface ScheduleWorkOrderRequest {
  assignedTechnicianId?: number;
  assignedTeamId?: number;
  plannedStartDateTime?: string;
  plannedEndDateTime?: string;
  planner?: string;
  preCheckNotes?: string;
  plannedMaterials?: PlannedMaterialPayload[];
}

export interface StartInProgressRequest {
  technicianId?: number;
  teamId?: number;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
}

export interface CheckInRequest {
  technicianId?: number;
  teamId?: number;
  checkInAt: string;
  notes?: string;
}

export interface CheckOutRequest {
  technicianId?: number;
  teamId?: number;
  checkOutAt: string;
  notes?: string;
}

export interface CompleteLaborEntry {
  technicianId?: number;
  laborHours?: number;
  hourlyRate?: number;
  laborDate?: string;
  notes?: string;
}

export interface CompleteMaterialUsed {
  inventoryItemId?: number;
  quantityUsed?: number;
  notes?: string;
}

export interface CompleteWorkOrderRequest {
  actualStartDateTime?: string;
  actualEndDateTime?: string;
  completionNotes?: string;
  failureCause?: string;
  remedyAction?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  laborEntries?: CompleteLaborEntry[];
  materialsUsed?: CompleteMaterialUsed[];
}

export interface CloseWorkOrderRequest {
  supervisorNotes?: string;
}

export interface CreateWorkOrderRequest {
  assetId?: number | null;
  location?: string;
  workType: string;
  priority: string;
  woTitle: string;
  descriptionScope: string;
  targetCompletionDate: string;
  attachmentUrl?: string;
}

interface WorkOrdersApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    workOrders?: ApiWorkOrder[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    last?: boolean;
  };
}

interface ApiWorkOrder {
  id?: number;
  workOrderId?: string;
  assetId?: string;
  assetName?: string;
  technician?: string;
  assignedTechnician?: string;
  priority?: string;
  woTitle?: string;
  status?: string;
  plannedEndDateTime?: string;
  targetCompletionDate?: string;
}

interface ApiPlannedMaterial {
  id?: number;
  inventoryItemId?: number;
  itemId?: string;
  itemName?: string;
  quantityPlanned?: number;
  unitCostSnapshot?: number;
  totalCostSnapshot?: number;
  notes?: string;
}

interface ApiLaborEntry {
  id?: number;
  technicianId?: number;
  technicianName?: string;
  laborHours?: number;
  hourlyRate?: number;
  laborCost?: number;
  laborDate?: string;
  notes?: string;
}

interface ApiMaterialUsage {
  id?: number;
  inventoryItemId?: number;
  itemId?: string;
  itemName?: string;
  quantityUsed?: number;
  unitCostSnapshot?: number;
  totalCostSnapshot?: number;
  notes?: string;
}

interface ApiWorkOrderDetail extends ApiWorkOrder {
  linkedServiceRequestDbId?: number;
  linkedServiceRequestId?: string;
  assetDbId?: number;
  location?: string;
  workType?: string;
  descriptionScope?: string;
  planner?: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  assignedTeamId?: number;
  assignedTeamName?: string;
  plannedStartDateTime?: string;
  plannedEndDateTime?: string;
  actualStartDateTime?: string;
  actualEndDateTime?: string;
  targetCompletionDate?: string;
  estimatedLaborHours?: number;
  estimatedLaborCost?: number;
  estimatedMaterialCost?: number;
  estimatedTotalCost?: number;
  actualLaborHours?: number;
  actualLaborCost?: number;
  actualMaterialCost?: number;
  actualTotalCost?: number;
  completionNotes?: string;
  failureCause?: string;
  remedyAction?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  supervisorNotes?: string;
  plannedMaterials?: ApiPlannedMaterial[];
  status?: string;
  source?: string;
  laborEntries?: ApiLaborEntry[];
  materialUsages?: ApiMaterialUsage[];
  notes?: string;
  activities?: Array<{ title?: string; status?: string; dueDate?: string }>;
  scheduledCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  checklistItems?: Array<Record<string, unknown>>;
  checkLogs?: Array<Record<string, unknown>>;
}

export interface WorkOrderDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiWorkOrderDetail;
}

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/work-orders`;

  constructor(private http: HttpClient) {}

  fetchWorkOrders(page: number, size: number): Observable<WorkOrdersApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrdersApiResponse>(this.apiUrl, { params, headers });
  }

  fetchWorkOrderById(id: string): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<WorkOrderDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  deleteWorkOrder(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  createWorkOrder(payload: CreateWorkOrderRequest): Observable<unknown> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(this.apiUrl, payload, { headers });
  }

  updateWorkOrder(id: number | string, payload: CreateWorkOrderRequest): Observable<unknown> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch(`${this.apiUrl}/${id}`, payload, { headers });
  }

  approveWorkOrder(id: number | string, payload: ApproveWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/approve`, payload, { headers });
  }

  scheduleWorkOrder(id: number | string, payload: ScheduleWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/schedule`, payload, { headers });
  }

  startInProgress(id: number | string, payload: StartInProgressRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/in-progress`, payload, { headers });
  }

  checkIn(id: number | string, payload: CheckInRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/check-in`, payload, { headers });
  }

  checkOut(id: number | string, payload: CheckOutRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/check-out`, payload, { headers });
  }

  completeWorkOrder(id: number | string, payload: CompleteWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/complete`, payload, { headers });
  }

  closeWorkOrder(id: number | string, payload: CloseWorkOrderRequest): Observable<WorkOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<WorkOrderDetailResponse>(`${this.apiUrl}/${id}/close`, payload, { headers });
  }
}
