import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompanyContextService } from './company-context.service';

export type IotRuleOperator = 'ABOVE' | 'BELOW';

export interface IotRule {
  id?: number;
  assetId?: number;
  assetName?: string;
  metricId?: number;
  metricCode?: string;
  metricName?: string;
  location?: string;
  ruleOperator?: IotRuleOperator;
  lowThreshold?: number;
  mediumThreshold?: number;
  highThreshold?: number;
  criticalThreshold?: number;
  cooldownMinutes?: number;
  spikeDelta?: number;
  consecutiveAbnormalCount?: number;
  autoCreateServiceRequest?: boolean;
  active?: boolean;
  lastTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IotRulesListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    content?: IotRule[];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface IotRuleDetailResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: IotRule;
}

export interface IotRulesQueryParams {
  page: number;
  size: number;
  sort?: string[];
}

export interface IotRuleCreatePayload {
  assetId: number;
  metricCode: string;
  location?: string;
  ruleOperator: IotRuleOperator;
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  criticalThreshold?: number;
  cooldownMinutes: number;
  spikeDelta: number;
  consecutiveAbnormalCount: number;
  autoCreateServiceRequest: boolean;
  active: boolean;
}

export interface IotRuleUpdatePayload {
  assetId?: number;
  metricCode?: string;
  location?: string;
  ruleOperator?: IotRuleOperator;
  lowThreshold?: number;
  mediumThreshold?: number;
  highThreshold?: number;
  criticalThreshold?: number;
  cooldownMinutes?: number;
  spikeDelta?: number;
  consecutiveAbnormalCount?: number;
  autoCreateServiceRequest?: boolean;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class IotRuleService {
  private readonly apiUrl = `${environment.apiUrl}/api/iot/rules`;

  constructor(
    private readonly http: HttpClient,
    private readonly companyContextService: CompanyContextService
  ) {}

  fetchRules(query: IotRulesQueryParams): Observable<IotRulesListResponse> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));

    (query.sort ?? []).forEach(sortValue => {
      params = params.append('sort', sortValue);
    });

    params = this.withCompanyId(params);

    return this.http.get<IotRulesListResponse>(this.apiUrl, {
      params,
      headers: this.getHeaders()
    });
  }

  fetchRuleById(id: number | string): Observable<IotRuleDetailResponse> {
    return this.http.get<IotRuleDetailResponse>(`${this.apiUrl}/${id}`, {
      params: this.withCompanyId(),
      headers: this.getHeaders()
    });
  }

  createRule(payload: IotRuleCreatePayload): Observable<IotRuleDetailResponse> {
    return this.http.post<IotRuleDetailResponse>(this.apiUrl, payload, {
      params: this.withCompanyId(),
      headers: this.getHeaders()
    });
  }

  updateRule(id: number | string, payload: IotRuleUpdatePayload): Observable<IotRuleDetailResponse> {
    return this.http.patch<IotRuleDetailResponse>(`${this.apiUrl}/${id}`, payload, {
      params: this.withCompanyId(),
      headers: this.getHeaders()
    });
  }

  deleteRule(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      params: this.withCompanyId(),
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
  }

  private withCompanyId(params: HttpParams = new HttpParams()): HttpParams {
    const companyId = this.companyContextService.getSelectedCompanyId();
    if (typeof companyId === 'number' && Number.isFinite(companyId)) {
      return params.set('companyId', String(companyId));
    }
    return params;
  }
}
