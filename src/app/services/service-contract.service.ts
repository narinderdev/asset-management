import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface ServiceContractsApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
    content?: ApiServiceContract[];
  };
}

interface ApiServiceContract {
  contractId?: string;
  contractName?: string;
  vendorName?: string;
  startDate?: string;
  endDate?: string;
  coverageType?: string;
  responseTimeSlaValue?: number;
  responseTimeSlaUnit?: string;
  uptimeSlaPercent?: number;
  status?: string;
  coverageTypeDescription?: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceContractService {
  private readonly apiUrl = `${environment.apiUrl}/api/service-contracts`;

  constructor(private http: HttpClient) {}

  fetchContracts(page: number, size: number): Observable<ServiceContractsApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<ServiceContractsApiResponse>(this.apiUrl, { params, headers });
  }
}
