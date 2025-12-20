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
  private readonly apiUrl = `${environment.apiUrl}/api/procurement/mr`;

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
}
