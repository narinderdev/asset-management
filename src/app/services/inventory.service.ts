import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface InventoryApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    size?: number;
    number?: number;
    content?: ApiInventoryItem[];
  };
}

interface ApiInventoryItem {
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  category?: string;
  unitOfMeasure?: string;
  manufacturer?: string;
  glAccountString?: string;
  expenseCode?: string;
  stockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  costPerUnit?: number;
  primaryVendorName?: string;
  active?: boolean;
  primaryVendorDbId?: number;
  manufacturerPartNumber?: string;
  warehouseId?: number;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

interface ApiInventoryDetail extends ApiInventoryItem {
  primaryVendorDbId?: number;
  manufacturerPartNumber?: string;
}

export interface WarehouseItem {
  id?: number;
  name?: string;
  address?: string;
  zoneAisle?: string;
  rackShelf?: string;
  binCode?: string;
  binDescription?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: WarehouseItem[];
}

export interface CreateWarehousePayload {
  name: string;
  address: string;
  zoneAisle: string;
  rackShelf: string;
  binCode: string;
  binDescription: string;
  active: boolean;
}

export interface CreateWarehouseResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: WarehouseItem;
}

export interface BaseApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
}

export interface CreateInventoryPayload {
  itemId?: string;
  itemName: string;
  category: string;
  unitOfMeasure: string;
  manufacturer: string;
  glAccountString?: string;
  expenseCode?: string;
  manufacturerPartNumber?: string;
  stockLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  costPerUnit: number;
  minStockLevel: number;
  maxStockLevel: number;
  primaryVendorDbId?: number;
  skuNumber?: string;
  warehouseId?: number;
  active: boolean;
}

export interface CreateInventoryResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiInventoryItem;
}

export interface InventoryDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: ApiInventoryDetail;
}

export interface InventoryReconciliationItem {
  id?: number;
  warehouseId?: number;
  warehouseName?: string;
  inventoryItemId?: number;
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  reconcileDate?: string;
  enteredBy?: string;
  systemQuantity?: number;
  physicalQuantity?: number;
  varianceQuantity?: number;
  costPerUnitSnapshot?: number;
  varianceCost?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalComment?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryReconciliationListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalPages?: number;
    totalElements?: number;
    size?: number;
    number?: number;
    content?: InventoryReconciliationItem[];
    first?: boolean;
    last?: boolean;
    numberOfElements?: number;
    empty?: boolean;
  };
}

export interface InventoryReconciliationDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: InventoryReconciliationItem;
}

export interface CreateInventoryReconciliationPayload {
  warehouseId: number;
  inventoryItemId: number;
  reconcileDate: string;
  enteredBy: string;
  physicalQuantity: number;
  reason: string;
}

export interface CreateInventoryReconciliationResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: InventoryReconciliationItem;
}

export interface InventoryReconciliationActionPayload {
  actor: string;
  comment: string;
}

export interface InventoryAuditLogItem {
  id?: number;
  transactionType?: string;
  referenceType?: string;
  referenceNumber?: string;
  inventoryItemId?: number;
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  beforeQuantity?: number;
  afterQuantity?: number;
  varianceQuantity?: number;
  performedBy?: string;
  reason?: string;
  createdAt?: string;
}

export interface InventoryAuditLogListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalPages?: number;
    totalElements?: number;
    size?: number;
    number?: number;
    content?: InventoryAuditLogItem[];
    first?: boolean;
    last?: boolean;
    numberOfElements?: number;
    empty?: boolean;
  };
}

export interface InventoryReportItem {
  id?: number;
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  stockLevel?: number;
  maxStockLevel?: number;
  minStockLevel?: number;
  reorderPoint?: number;
  warehouseName?: string;
  warehouseId?: number;
  unitCost?: number;
}

export interface InventoryReportTopStockValueItem {
  itemName?: string;
  itemId?: number;
  skuNumber?: string;
  stockValue?: number;
}

export interface InventoryReportTransaction {
  id?: number;
  dateTime?: string;
  transactionType?: string;
  inventoryItemId?: number;
  itemId?: string;
  skuNumber?: string;
  itemName?: string;
  qtyChange?: number;
  qtyBefore?: number;
  qtyAfter?: number;
  referenceType?: string;
  referenceNumber?: string;
  performedBy?: string;
  reason?: string;
  warehouseId?: number;
  warehouseName?: string;
}

export interface InventoryReportPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export interface InventoryReportResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    items?: InventoryReportItem[] | InventoryReportPage<InventoryReportItem>;
    top5HighStock?: InventoryReportItem[];
    topStockValue?: InventoryReportTopStockValueItem[];
    transactions?: InventoryReportTransaction[] | InventoryReportPage<InventoryReportTransaction>;
    totalQuantityByTxnType?: Record<string, number>;
  };
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/inventory-items`;
  private readonly warehouseUrl = `${environment.apiUrl}/api/warehouses`;
  private readonly inventoryReconcileUrl = `${environment.apiUrl}/api/inventory/reconciliations`;
  private readonly inventoryAuditLogUrl = `${environment.apiUrl}/api/inventory/audit-logs`;
  private readonly inventoryReportUrl = `${environment.apiUrl}/api/inventory/report`;

  constructor(private http: HttpClient) {}

  /**
   * Builds headers with auth token (if present) plus ngrok skip flag.
   */
  private buildAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem('authToken') ||
        localStorage.getItem('authtoken') ||
        localStorage.getItem('token');
      if (raw) {
        const value = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
        headers = headers.set('Authorization', value);
      }
    }

    return headers;
  }

  fetchInventory(page: number, size: number): Observable<InventoryApiResponse> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    const headers = this.buildAuthHeaders();

    return this.http.get<InventoryApiResponse>(this.apiUrl, { params, headers });
  }

  createInventory(payload: CreateInventoryPayload): Observable<CreateInventoryResponse> {
    const headers = this.buildAuthHeaders();

    return this.http.post<CreateInventoryResponse>(this.apiUrl, payload, { headers });
  }

  fetchInventoryItemById(id: number | string): Observable<InventoryDetailResponse> {
    const headers = this.buildAuthHeaders();

    return this.http.get<InventoryDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  updateInventory(id: number | string, payload: CreateInventoryPayload): Observable<CreateInventoryResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.patch<CreateInventoryResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  deleteInventory(id: number | string): Observable<void> {
    const headers = this.buildAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  fetchWarehouses(): Observable<WarehouseListResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.get<WarehouseListResponse>(this.warehouseUrl, { headers });
  }

  createWarehouse(payload: CreateWarehousePayload): Observable<CreateWarehouseResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.post<CreateWarehouseResponse>(this.warehouseUrl, payload, { headers });
  }

  updateWarehouse(id: number | string, payload: CreateWarehousePayload): Observable<CreateWarehouseResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.patch<CreateWarehouseResponse>(`${this.warehouseUrl}/${id}`, payload, { headers });
  }

  deleteWarehouse(id: number | string): Observable<BaseApiResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.delete<BaseApiResponse>(`${this.warehouseUrl}/${id}`, { headers });
  }

  fetchWarehouseById(id: number | string): Observable<CreateWarehouseResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.get<CreateWarehouseResponse>(`${this.warehouseUrl}/${id}`, { headers });
  }

  fetchInventoryReconciliations(
    page: number = 0,
    size: number = 10,
    sort: string = 'reconcileDate,desc'
  ): Observable<InventoryReconciliationListResponse> {
    const headers = this.buildAuthHeaders();
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', sort)
      // Keep both forms so Spring pageable binding works across controller configs.
      .set('pageable.page', String(page))
      .set('pageable.size', String(size))
      .set('pageable.sort', sort);

    return this.http.get<InventoryReconciliationListResponse>(this.inventoryReconcileUrl, { headers, params });
  }

  createInventoryReconciliation(
    payload: CreateInventoryReconciliationPayload
  ): Observable<CreateInventoryReconciliationResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.post<CreateInventoryReconciliationResponse>(this.inventoryReconcileUrl, payload, { headers });
  }

  updateInventoryReconciliation(
    id: number | string,
    payload: CreateInventoryReconciliationPayload
  ): Observable<CreateInventoryReconciliationResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.put<CreateInventoryReconciliationResponse>(`${this.inventoryReconcileUrl}/${id}`, payload, { headers });
  }

  fetchInventoryReconciliationById(id: number | string): Observable<InventoryReconciliationDetailResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.get<InventoryReconciliationDetailResponse>(`${this.inventoryReconcileUrl}/${id}`, { headers });
  }

  approveInventoryReconciliation(
    id: number | string,
    payload: InventoryReconciliationActionPayload
  ): Observable<BaseApiResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.patch<BaseApiResponse>(`${this.inventoryReconcileUrl}/${id}/approve`, payload, { headers });
  }

  rejectInventoryReconciliation(
    id: number | string,
    payload: InventoryReconciliationActionPayload
  ): Observable<BaseApiResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.patch<BaseApiResponse>(`${this.inventoryReconcileUrl}/${id}/reject`, payload, { headers });
  }

  postInventoryReconciliationAdjustment(id: number | string): Observable<BaseApiResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.patch<BaseApiResponse>(`${this.inventoryReconcileUrl}/${id}/post`, {}, { headers });
  }

  deleteInventoryReconciliation(id: number | string): Observable<BaseApiResponse> {
    const headers = this.buildAuthHeaders();
    return this.http.delete<BaseApiResponse>(`${this.inventoryReconcileUrl}/${id}`, { headers });
  }

  fetchInventoryAuditLogs(
    page: number = 0,
    size: number = 10
  ): Observable<InventoryAuditLogListResponse> {
    const headers = this.buildAuthHeaders();
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('pageable.page', String(page))
      .set('pageable.size', String(size));

    return this.http.get<InventoryAuditLogListResponse>(this.inventoryAuditLogUrl, { headers, params });
  }

  fetchInventoryReport(
    filters: {
      view?: 'ITEMS' | 'TRANSACTIONS';
      warehouseId?: number;
      lowStockOnly?: boolean;
      transactionType?: string;
      referenceType?: string;
      period?: string;
      topN?: number;
      page?: number;
      size?: number;
    } = {}
  ): Observable<InventoryReportResponse> {
    const headers = this.buildAuthHeaders();
    const view = filters.view ?? 'ITEMS';
    const page = filters.page ?? 0;
    const size = filters.size ?? 10;
    let params = new HttpParams()
      .set('view', view)
      .set('page', String(page))
      .set('size', String(size))
      .set('pageable.page', String(page))
      .set('pageable.size', String(size));

    if (filters.warehouseId !== undefined && filters.warehouseId !== null) {
      params = params.set('warehouseId', String(filters.warehouseId));
    }
    if (typeof filters.lowStockOnly === 'boolean') {
      params = params.set('lowStockOnly', String(filters.lowStockOnly));
    }
    if (filters.transactionType) {
      params = params.set('transactionType', filters.transactionType);
    }
    if (filters.referenceType) {
      params = params.set('referenceType', filters.referenceType);
    }
    if (filters.period) {
      params = params.set('period', filters.period);
    }
    if (filters.topN !== undefined && filters.topN !== null) {
      params = params.set('topN', String(filters.topN));
    }

    return this.http.get<InventoryReportResponse>(this.inventoryReportUrl, { headers, params });
  }
}
