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
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

interface ApiInventoryDetail extends ApiInventoryItem {
  primaryVendorDbId?: number;
  manufacturerPartNumber?: string;
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

  constructor(private http: HttpClient) {}

  fetchInventory(page: number, size: number): Observable<InventoryApiResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<InventoryApiResponse>(this.apiUrl, { params, headers });
  }

  createInventory(payload: CreateInventoryPayload): Observable<CreateInventoryResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<CreateInventoryResponse>(this.apiUrl, payload, { headers });
  }

  fetchInventoryItemById(id: number | string): Observable<InventoryDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<InventoryDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  updateInventory(id: number | string, payload: CreateInventoryPayload): Observable<CreateInventoryResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.patch<CreateInventoryResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  deleteInventory(id: number | string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }
}
