import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface AssetsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    size?: number;
    number?: number;
    content?: ApiAsset[];
  };
}

interface ApiAsset {
  id?: number;
  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetCategory?: string;
  status?: string;
  location?: AssetLocationDetails;
  warrantyLifecycle?: {
    lastMaintenanceDate?: string;
    warrantyEnd?: string;
  };
  financialDetails?: {
    acquisitionDate?: string;
  };
}

export interface AssetLocationDetails {
  primaryLocation?: string;
  functionalLocation?: string;
  department?: string;
  costCenter?: string;
  assignedOwner?: string;
  maintenanceTeam?: string;
}

export interface AssetDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    id?: number;
    assetId?: string;
    assetName?: string;
    assetCategory?: string;
    assetType?: string;
    status?: string;
    criticality?: string;
    ownership?: string;
    assetTag?: string;
    shortDescription?: string;
    location?: string | AssetLocationDetails;
    parentAssetId?: number | null;
    technicalDetails?: {
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      yearOfManufacture?: string | number;
      powerRating?: string;
      voltage?: string;
      capacity?: string;
    };
    financialDetails?: {
      acquisitionDate?: string;
      acquisitionCost?: number;
      supplier?: string;
      poInvoiceNumber?: string;
      depreciationMethod?: string;
      usefulLifeYears?: number | null;
      depreciationStartDate?: string;
      salvageValue?: number;
      accumulatedDepreciation?: number;
      currentBookValue?: number;
    };
    warrantyLifecycle?: {
      commissioningDate?: string;
      warrantyStart?: string;
      warrantyEnd?: string;
      warrantyProvider?: string;
      serviceContract?: string;
      expectedUsefulLifeYears?: number | null;
      plannedReplacementDate?: string;
      lastMaintenanceDate?: string;
      nextPlannedMaintenance?: string;
    };
    safetyOperations?: {
      safetyCritical?: boolean;
      safetyNotes?: string;
      operatingInstructions?: string;
    };
  };
}

export interface AssetCreatePayload {
  assetId?: string;
  assetName: string;
  shortDescription?: string;
  assetCategory: string;
  assetType?: string;
  parentAssetId?: number | null;
  status: string;
  criticality?: string;
  ownership?: string;
  assetTag?: string;
  location?: AssetLocationDetails;
  technicalDetails?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    yearOfManufacture?: number;
    powerRating?: string;
    voltage?: string;
    capacity?: string;
  };
  financialDetails?: {
    acquisitionDate?: string;
    acquisitionCost?: number;
    supplier?: string;
    poInvoiceNumber?: string;
    depreciationMethod?: string;
    usefulLifeYears?: number | null;
    depreciationStartDate?: string;
    salvageValue?: number;
    accumulatedDepreciation?: number;
    currentBookValue?: number;
  };
  warrantyLifecycle?: {
    commissioningDate?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    warrantyProvider?: string;
    serviceContract?: string;
    expectedUsefulLifeYears?: number | null;
    plannedReplacementDate?: string;
    lastMaintenanceDate?: string;
    nextPlannedMaintenance?: string;
  };
  safetyOperations?: {
    safetyCritical?: boolean;
    safetyNotes?: string;
    operatingInstructions?: string;
  };
}

export interface AssetUpdatePayload {
  assetId?: string;
  basic: {
    assetName: string;
    shortDescription?: string;
    assetCategory: string;
    assetType?: string;
    parentAssetId?: number | null;
    status?: string;
    criticality?: string;
    ownership?: string;
    assetTag?: string;
  };
  locationOrg?: AssetCreatePayload['location'];
  technicalDetails?: AssetCreatePayload['technicalDetails'];
  financialDetails?: AssetCreatePayload['financialDetails'];
  warrantyLifecycle?: AssetCreatePayload['warrantyLifecycle'];
  safetyOperations?: AssetCreatePayload['safetyOperations'];
}

export interface AssetCreateResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    id?: number;
    assetId?: string;
    assetName?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private readonly apiUrl = `${environment.apiUrl}/api/assets`;

  constructor(private http: HttpClient) {}

  fetchAssets(page: number, size: number): Observable<AssetsApiResponse> {
    const pageable = JSON.stringify({ page, size, sort: [] });
    const params = new HttpParams().set('pageable', pageable);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<AssetsApiResponse>(this.apiUrl, { params, headers });
  }

  fetchAssetById(id: string): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<AssetDetailResponse>(`${this.apiUrl}/${id}`, { headers });
  }

  createAsset(payload: AssetCreatePayload): Observable<AssetCreateResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<AssetCreateResponse>(this.apiUrl, payload, { headers });
  }

  updateLocation(
    id: string,
    payload: AssetCreatePayload['location']
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/location`, payload, { headers });
  }

  updateTechnical(
    id: string,
    payload: AssetCreatePayload['technicalDetails']
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/technical`, payload, { headers });
  }

  updateFinancial(
    id: string,
    payload: AssetCreatePayload['financialDetails']
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/financial`, payload, { headers });
  }

  updateWarranty(
    id: string,
    payload: AssetCreatePayload['warrantyLifecycle']
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/warranty`, payload, { headers });
  }

  updateSafety(
    id: string,
    payload: AssetCreatePayload['safetyOperations']
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/safety`, payload, { headers });
  }

  deleteAsset(id: string): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  updateAsset(id: string, payload: AssetUpdatePayload): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.patch<AssetDetailResponse>(`${this.apiUrl}/${id}`, payload, { headers });
  }
}
