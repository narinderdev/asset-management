import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
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
}
