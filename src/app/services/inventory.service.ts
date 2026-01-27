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

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/inventory-items`;
  private readonly warehouseUrl = `${environment.apiUrl}/api/warehouses`;

  constructor(private http: HttpClient) {}

  /**
   * Builds headers with auth token (if present) plus ngrok skip flag.
   */
  private buildAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
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
}
