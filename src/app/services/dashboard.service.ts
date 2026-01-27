import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: DashboardData;
}

export interface DashboardData {
  maintenance_cost_summary?: MaintenanceCostSummary;
  metadata?: DashboardMetadata;
  recent_work_orders?: RecentWorkOrder[];
  new_service_requests?: RecentServiceRequest[];
  summary_metrics?: SummaryMetrics;
  work_orders_by_status?: WorkOrdersByStatus;
  requests_not_accepted_count?: number;
}

export interface DashboardMetadata {
  generated_at?: string | null;
  data_freshness?: string | null;
}

export interface MaintenanceCostSummary {
  period?: string;
  data?: Array<MaintenanceCostDataPoint>;
}

export interface MaintenanceCostDataPoint {
  cost?: number;
  currency?: string;
  month?: string;
  unit?: string;
}

export interface SummaryMetrics {
  active_material_requisitions?: SummaryMetric;
  active_work_orders?: SummaryMetric;
  critical_assets_down?: SummaryMetric;
  open_service_requests?: SummaryMetric;
  requests_not_accepted_count?: SummaryMetric;
}

export interface SummaryMetric {
  change_direction?: string | null;
  change_percentage?: number | null;
  comparison_period?: string | null;
  count?: number;
}

export interface WorkOrdersByStatus {
  completed?: number;
  in_progress?: number;
  new?: number;
  total?: number;
}

export interface RecentWorkOrder {
  asset?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status?: string | null;
  technician?: string | null;
  title?: string | null;
  wo_id?: string | null;
  wo_db_id?: number | null;
}

export interface RecentServiceRequest {
  asset?: string | null;
  priority?: string | null;
  status?: string | null;
  title?: string | null;
  requester?: string | null;
  request_date?: string | null;
  sr_id?: string | null;
  sr_db_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/api/dashboard`;

  constructor(private http: HttpClient) {}

  fetchDashboard(): Observable<DashboardApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<DashboardApiResponse>(this.apiUrl, { headers });
  }
}
