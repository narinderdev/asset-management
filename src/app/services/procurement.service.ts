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
  shipToType?: string;
  shipToWarehouseId?: number;
  shipToWorkOrderId?: number;
  lines: CreateMrLine[];
}

export interface PurchaseRequisitionItem {
  id?: number;
  mrNumber?: string;
  poNumber?: string;
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
  remarks?: string;
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
  createdByUserId?: string;
  status?: string;
  requiredByDate?: string;
  expectedDeliveryDate?: string;
  deliveredAt?: string;
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

export interface UpdatePoStatusPayload {
  newStatus: string;
  remarks?: string;
}

export interface GoodsReceiptLine {
  id?: number;
  poLineId?: number;
  itemId?: number;
  receivedQty?: number;
  itemName?: string;
  uom?: string;
}

export interface GoodsReceiptItem {
  id?: number;
  grnNumber?: string;
  poId?: number;
  vendorName?: string;
  vendorId?: number;
  status?: string;
  receivedByUserId?: string;
  receivedAtUtc?: string;
  dayKeyUtc?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lines?: GoodsReceiptLine[];
}

export interface GoodsReceiptListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    number?: number;
    content?: GoodsReceiptItem[];
  };
}

export interface GoodsReceiptDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: GoodsReceiptItem;
}

export interface ReturnTransactionItem {
  id?: number;
  grnId?: number;
  grnNumber?: string;
  grnLineId?: number;
  poId?: number;
  poLineId?: number;
  vendorId?: number;
  itemDbId?: number;
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  orderedQty?: number;
  receivedQty?: number;
  returnQty?: number;
  totalReturnedQty?: number;
  unitCost?: number;
  returnCost?: number;
  stockBefore?: number;
  stockAfter?: number;
  reason?: string;
  performedBy?: string;
  createdAt?: string;
}

export interface ReturnTransactionListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ReturnTransactionItem[];
}

export interface CreateGrnLinePayload {
  itemId?: number;
  poLineId?: number;
  orderedQty?: number;
  receivedQty: number;
  returnQty?: number;
  returnReason?: string;
}

export interface CreateGrnPayload {
  poId?: number;
  receivedByUserId: string;
  notes?: string;
  lines: CreateGrnLinePayload[];
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

export interface CreatePoLine {
  itemId: number;
  orderedQty: number;
  uom: string;
  unitPrice?: number;
  remarks?: string;
}

export interface CreatePoPayload {
  vendorId: number;
  requiredByDate: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  glAccountString?: string;
  createdByUserId: string;
  mrId?: number;
  neededByDate?: string;
  notes?: string;
  shipToType?: string;
  shipToWarehouseId?: number;
  shipToWorkOrderId?: number;
  lines: CreatePoLine[];
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private readonly apiUrl = `${environment.apiUrl}/api/procurement/mr`;
  private readonly poApiUrl = `${environment.apiUrl}/api/procurement/po`;

  constructor(private http: HttpClient) {}

  fetchRequisitions(page: number, size: number, sort: string[] = []): Observable<PurchaseRequisitionListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

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

  updateMr(id: number | string, payload: CreateMrPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.put(`${this.apiUrl}/${id}`, payload, { headers });
  }

  fetchPurchaseOrders(page: number, size: number, sort: string[] = []): Observable<PurchaseOrderListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

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

  fetchGoodsReceipts(poId?: number | string, from?: string, to?: string, page?: number, size?: number): Observable<GoodsReceiptListResponse> {
    let params = new HttpParams();
    if (poId !== undefined && poId !== null && poId !== '') {
      params = params.set('poId', String(poId));
    }
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    if (page !== undefined) {
      params = params.set('page', String(page));
    }
    if (size !== undefined) {
      params = params.set('size', String(size));
    }

    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<GoodsReceiptListResponse>(`${environment.apiUrl}/api/procurement/grn`, {
      params,
      headers
    });
  }

  createGrn(payload: CreateGrnPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post(`${environment.apiUrl}/api/procurement/grn`, payload, { headers });
  }

  fetchGoodsReceiptById(id: number | string): Observable<GoodsReceiptDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<GoodsReceiptDetailResponse>(`${environment.apiUrl}/api/procurement/grn/${id}`, {
      headers
    });
  }

  fetchReturnTransactions(): Observable<ReturnTransactionListResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<ReturnTransactionListResponse>(`${environment.apiUrl}/api/procurement/returns`, {
      headers
    });
  }

  updatePurchaseOrderStatus(id: number | string, payload: UpdatePoStatusPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch(`${this.poApiUrl}/${id}/status`, payload, { headers });
  }

  createPurchaseOrder(payload: CreatePoPayload): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post(this.poApiUrl, payload, { headers });
  }
}
