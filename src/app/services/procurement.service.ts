import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface PurchaseRequisitionPage<T = PurchaseRequisitionItem> {
  totalElements?: number;
  totalPages?: number;
  size?: number;
  content?: T[];
  number?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

export interface CreateMrLine {
  itemId: number;
  requestedQty: number;
  uom: string;
  remarks?: string;
}

export interface CreateMrPayload {
  requestedByUserId: string;
  neededByDate?: string;
  notes?: string;
  lines: CreateMrLine[];
}

export interface PurchaseRequisitionItem {
  id?: number;
  mrNumber?: string;
  requestedByUserId?: string;
  status?: string;
  neededByDate?: string;
  notes?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  lines?: PurchaseRequisitionLine[];
}

export interface PurchaseRequisitionLine {
  id?: number;
  lineType?: string;
  inventoryItemDbId?: number;
  itemId?: string;
  itemName?: string;
  assetDbId?: number;
  assetId?: string;
  assetName?: string;
  description?: string;
  uom?: string;
  qtyRequested?: number;
  requestedQty?: number;
  quantity?: number;
  estimatedUnitPrice?: number;
  costPerUnit?: number;
  lineTotal?: number;
}

export interface PurchaseRequisitionListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseRequisitionPage;
}

export interface PurchaseRequisitionDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseRequisitionItem;
}

export interface PurchaseOrderItem {
  id?: number;
  poNumber?: string;
  vendorName?: string;
  vendorId?: number;
  status?: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  totalAmount?: number;
  lines?: PurchaseOrderLine[];
  createdBy?: string;
}

export interface PurchaseOrderListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseRequisitionPage<PurchaseOrderItem>;
}

export interface PurchaseOrderLine {
  id?: number;
  itemId?: number;
  orderedQty?: number;
  receivedQty?: number;
  unitPrice?: number;
  uom?: string;
  remarks?: string;
}

export interface PurchaseOrderDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseOrderItem;
}

export interface RejectMrPayload {
  rejectedByUserId: string;
  reason: string;
}

export interface ApproveMrPayload {
  approvedByUserId: string;
}

export interface ConvertToPoLineOverride {
  mrLineId: number;
  unitPrice: number;
  orderedQty: number;
  uom: string;
  remarks?: string;
}

export interface ConvertToPoPayload {
  vendorId: number;
  createdByUserId: string;
  expectedDeliveryDate: string;
  remarks?: string;
  lineOverrides: ConvertToPoLineOverride[];
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private readonly apiUrl = `${environment.apiUrl}/api/procurement/mr`;
  private readonly poApiUrl = `${environment.apiUrl}/api/procurement/po`;

  constructor(private http: HttpClient) {}

  fetchRequisitions(page: number, size: number, sort: string[] = []): Observable<PurchaseRequisitionListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    sort.forEach(value => {
      params = params.append('sort', value);
    });

    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PurchaseRequisitionListResponse>(this.apiUrl, { params, headers });
  }

  createMr(payload: CreateMrPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(this.apiUrl, payload, { headers });
  }

  fetchMrById(id: number | string): Observable<PurchaseRequisitionDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PurchaseRequisitionDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  rejectMr(id: number | string, payload: RejectMrPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(`${this.apiUrl}/${id}/reject`, payload, { headers });
  }

  approveMr(id: number | string, payload: ApproveMrPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(`${this.apiUrl}/${id}/approve`, payload, { headers });
  }

  convertMrToPo(id: number | string, payload: ConvertToPoPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(`${this.apiUrl}/${id}/convert-to-po`, payload, { headers });
  }

  fetchPurchaseOrders(page: number, size: number, sort: string[] = []): Observable<PurchaseOrderListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    sort.forEach(value => {
      params = params.append('sort', value);
    });

    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PurchaseOrderListResponse>(this.poApiUrl, { params, headers });
  }

  fetchPurchaseOrderById(id: number | string): Observable<PurchaseOrderDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PurchaseOrderDetailResponse>(`${this.poApiUrl}/${id}`, { headers });
  }
}
