import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface PurchaseRequisitionsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseRequisitionPage;
}

interface PurchaseRequisitionPage {
  totalElements?: number;
  totalPages?: number;
  size?: number;
  content?: PurchaseRequisitionItem[];
  number?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

export interface PurchaseRequisitionItem {
  id?: number;
  prId?: string;
  requester?: string;
  requestDate?: string;
  requiredByDate?: string;
  priority?: string;
  department?: string;
  costCenter?: string;
  currency?: string;
  notes?: string;
  preferredVendorId?: number;
  preferredVendorName?: string;
  requiredForType?: string;
  requiredForReference?: string;
  status?: string;
  totalEstimatedCost?: number;
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
  estimatedUnitPrice?: number;
  lineTotal?: number;
}

export interface PurchaseRequisitionListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PurchaseRequisitionPage;
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private readonly apiUrl = `${environment.apiUrl}/api/purchase-requisitions`;

  constructor(private http: HttpClient) {}

  fetchRequisitions(page: number, size: number): Observable<PurchaseRequisitionListResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<PurchaseRequisitionListResponse>(this.apiUrl, { params, headers });
  }
}
