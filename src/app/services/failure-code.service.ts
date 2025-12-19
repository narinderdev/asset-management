import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface FailureCodesApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: FailureCodeEntryDto[];
}

interface FailureCodeEntryDto {
  failureSymptomCode?: string;
  symptomDescription?: string;
  failureCauseCode?: string;
  causeDescription?: string;
  actionCode?: string;
  actionDescription?: string;
}

@Injectable({ providedIn: 'root' })
export class FailureCodeService {
  private readonly apiUrl = `${environment.apiUrl}/api/failure-codes`;

  constructor(private http: HttpClient) {}

  fetchFailureCodes(): Observable<FailureCodesApiResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    return this.http.get<FailureCodesApiResponse>(this.apiUrl, { headers });
  }
}
