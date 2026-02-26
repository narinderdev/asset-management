import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssetCategory {
  id?: number;
  name?: string;
}

export interface AssetType {
  id?: number;
  code?: string;
  name?: string;
  assetCategoryId?: number;
  assetCategory?: string;
  defaultCriticality?: string;
  defaultGlAccount?: string;
  utilityAccount?: string;
  retirementAccount?: string;
  insuranceRequired?: boolean;
  active?: boolean;
}

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

export interface AssetTypesApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: AssetType[];
}

export interface AssetTypeDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: AssetType;
}

export interface AssetTypeCreatePayload {
  code: string;
  name: string;
  assetCategoryId: number;
  defaultCriticality: string;
  defaultGlAccount: string;
  utilityAccount?: string;
  retirementAccount?: string;
  insuranceRequired: boolean;
  active: boolean;
}

interface ApiAsset {
  id?: number;
  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetTypeId?: number;
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
  location?: string;
  primaryLocation?: string;
  functionalLocation?: string;
  department?: string;
  costCenter?: string;
  assignedOwner?: string;
  maintenanceTeam?: string;
}

export interface AssetReportPage {
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  content?: ApiAsset[];
}

export interface WorkOrderReportPage {
  workOrders?: any[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
}

export interface AssetLocationOrgPayload {
  location?: string;
  department?: string;
  costCenter?: string;
  assignedOwner?: string;
  maintenanceTeam?: string;
}

export interface AssetInsurancePayload {
  insuranceProvider?: string;
  policyNumber?: string;
  policyStartDate?: string;
  policyExpiryDate?: string;
  insuranceStatus?: string;
  policyType?: string;
  certificateUrl?: string;
  coverageAmount?: number;
  premiumAmount?: number;
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
    assetTypeId?: number;
    assetTypeCode?: string;
    status?: string;
    criticality?: string;
    ownership?: string;
    assetTag?: string;
    shortDescription?: string;
    location?: string | AssetLocationDetails;
    parentAssetId?: number | null;
    // NEW FIELDS
    functionalClass?: string;
    retirementUnit?: string;
    utilityAccount?: string;
    propertyGroup?: string;
    propertyUnit?: string;
    serialNumber?: string;
    insurance?: {
      insuranceProvider?: string;
      policyNumber?: string;
      policyStartDate?: string;
      policyExpiryDate?: string;
      insuranceStatus?: string;
      policyType?: string;
      certificateUrl?: string;
      coverageAmount?: number;
      premiumAmount?: number;
    };
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
      expectedUsefulLifeYears?: number | null;
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
    predictiveThresholds?: Array<{
      id?: number;
      assetId?: number;
      assetName?: string;
      meterType?: string;
      warningThreshold?: number;
      criticalThreshold?: number;
      autoCreateWo?: boolean;
      defaultPriority?: string;
      cooldownHours?: number;
      lastTriggeredSeverity?: string | null;
      meterReadings?: Array<{
        id?: number;
        meterType?: string;
        readingValue?: number;
        readingTime?: string;
        severity?: string;
        notes?: string;
        createdAt?: string;
      }>;
    }>;
  };
}

export interface AssetCreatePayload {
  assetId?: string;
  assetName: string;
  shortDescription?: string;
  assetCategory: string;
  assetType?: string;
  assetTypeId?: number;
  assetTypeCode?: string;
  parentAssetId?: number | null;
  status: string;
  criticality?: string;
  ownership?: string;
  assetTag?: string;
  location?: string | AssetLocationDetails;
  // NEW FIELDS
  functionalClass?: string;
  retirementUnit?: string;
  utilityAccount?: string;
  propertyGroup?: string;
  propertyUnit?: string;
  serialNumber?: string;
  insurance?: {
    insuranceProvider?: string;
    policyNumber?: string;
    policyStartDate?: string;
    policyExpiryDate?: string;
    insuranceStatus?: string;
    policyType?: string;
    certificateUrl?: string;
    coverageAmount?: number;
    premiumAmount?: number;
  };
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
    expectedUsefulLifeYears?: number | null;
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
    assetTypeId?: number;
    assetTypeCode?: string;
    parentAssetId?: number | null;
    status?: string;
    criticality?: string;
    ownership?: string;
    assetTag?: string;
    // NEW FIELDS
    functionalClass?: string;
    retirementUnit?: string;
    utilityAccount?: string;
    propertyGroup?: string;
    propertyUnit?: string;
    serialNumber?: string;
  };
  locationOrg?: AssetLocationOrgPayload;
  insurance?: {
    insuranceProvider?: string;
    policyNumber?: string;
    policyStartDate?: string;
    policyExpiryDate?: string;
    insuranceStatus?: string;
    policyType?: string;
    certificateUrl?: string;
    coverageAmount?: number;
    premiumAmount?: number;
  };
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
    assetTypeId?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private readonly apiUrl = `${environment.apiUrl}/api/assets`;

  constructor(private http: HttpClient) {}

  fetchAssets(page: number, size: number): Observable<AssetsApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<AssetsApiResponse>(this.apiUrl, { params, headers });
  }

  fetchAssetTypes(): Observable<AssetTypesApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<AssetTypesApiResponse>(`${environment.apiUrl}/api/asset-types`, {
      headers
    });
  }

  fetchAssetReports(params: {
    page: number;
    size: number;
    status?: string;
    warrantyExpiryDays?: string | number;
    criticality?: string;
    assetTypeId?: string | number;
  }): Observable<{ data?: AssetReportPage }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('size', String(params.size));
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.warrantyExpiryDays !== undefined && params.warrantyExpiryDays !== '') {
      httpParams = httpParams.set('warrantyExpiryDays', String(params.warrantyExpiryDays));
    }
    if (params.criticality) httpParams = httpParams.set('criticality', params.criticality);
    if (params.assetTypeId) httpParams = httpParams.set('assetTypeId', String(params.assetTypeId));

    return this.http.get<{ data?: AssetReportPage }>(`${environment.apiUrl}/api/reports/assets`, {
      headers,
      params: httpParams
    });
  }

  fetchWorkOrderReports(params: { page: number; size: number; status?: string }): Observable<{ data?: WorkOrderReportPage }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('size', String(params.size));
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<{ data?: WorkOrderReportPage }>(`${environment.apiUrl}/api/reports/work-orders`, {
      headers,
      params: httpParams
    });
  }

  fetchAssetTypeById(id: string | number): Observable<AssetTypeDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<AssetTypeDetailResponse>(`${environment.apiUrl}/api/asset-types/${id}`, {
      headers
    });
  }

  updateAssetType(id: string | number, payload: AssetTypeCreatePayload): Observable<AssetTypeDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.put<AssetTypeDetailResponse>(`${environment.apiUrl}/api/asset-types/${id}`, payload, {
      headers
    });
  }

  deleteAssetType(id: string | number): Observable<void> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.delete<void>(`${environment.apiUrl}/api/asset-types/${id}`, { headers });
  }

  fetchAssetCategories(): Observable<{ data?: AssetCategory[] }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<{ data?: AssetCategory[] }>(`${environment.apiUrl}/api/asset-categories`, {
      headers
    });
  }

  createAssetType(payload: AssetTypeCreatePayload): Observable<{ statusCode?: number; message?: string }> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<{ statusCode?: number; message?: string }>(
      `${environment.apiUrl}/api/asset-types`,
      payload,
      { headers }
    );
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
    payload: AssetLocationOrgPayload
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/location`, payload, { headers });
  }

  updateInsurance(
    id: string,
    payload: AssetInsurancePayload
  ): Observable<AssetDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.post<AssetDetailResponse>(`${this.apiUrl}/${id}/insurance`, payload, { headers });
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
