import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  uploadId: string;
  fileName: string;
  rows: number;
  message?: string;
}

interface UploadApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: Partial<UploadResponse>;
}

export interface RunResponse {
  runId: string;
  status: RunStatus;
}

interface RunApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: Partial<RunResponse>;
}

export type RunStatus = 'queued' | 'running' | 'passed' | 'failed';

export interface RunStatusResponse {
  runId: string;
  status: RunStatus;
  progress?: number | null;
  logs?: string[];
  message?: string;
}

interface StatusApiResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    status?: string;
    logs?: string[];
    progress?: number | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TestRunnerService {
  private readonly baseUrl = environment.apiUrl ?? '';
  private readonly uploadEndpoint = '/api/upload';
  private readonly runEndpoint = '/api/run-test';
  private readonly statusEndpoint = '/api/status';

  constructor(private http: HttpClient) {}

  uploadTestData(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<UploadApiResponse>(`${this.baseUrl}${this.uploadEndpoint}`, formData, {
        headers: this.buildHeaders(),
      })
      .pipe(map((res) => this.normalizeUploadResponse(res, file.name)));
  }

  runTests(uploadId: string): Observable<RunResponse> {
    const body = { uploadId };
    return this.http
      .post<RunApiResponse>(`${this.baseUrl}${this.runEndpoint}`, body, {
        headers: this.buildJsonHeaders(),
      })
      .pipe(map((res) => this.normalizeRunResponse(res)));
  }

  getRunStatus(runId: string): Observable<RunStatusResponse> {
    return this.http
      .get<StatusApiResponse>(`${this.baseUrl}${this.statusEndpoint}/${encodeURIComponent(runId)}`, {
        headers: this.buildHeaders(),
      })
      .pipe(map((res) => this.normalizeStatusResponse(res, runId)));
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
  }

  private buildJsonHeaders(): HttpHeaders {
    return this.buildHeaders().set('Content-Type', 'application/json');
  }

  private normalizeUploadResponse(response: UploadApiResponse, fallbackName: string): UploadResponse {
    const payload = response?.data ?? {};
    return {
      uploadId: payload.uploadId ?? '',
      fileName: payload.fileName ?? fallbackName,
      rows: typeof payload.rows === 'number' ? payload.rows : 0,
      message: payload.message ?? response.message ?? response.status,
    };
  }

  private normalizeRunResponse(response: RunApiResponse): RunResponse {
    const payload = response?.data ?? {};
    return {
      runId: payload.runId ?? '',
      status: (payload.status as RunStatus) ?? 'queued',
    };
  }

  private normalizeStatusResponse(response: StatusApiResponse, runId: string): RunStatusResponse {
    const payload = response?.data ?? {};
    const statusValue = (payload.status as RunStatus) ?? 'running';
    return {
      runId,
      status: statusValue,
      progress: payload.progress ?? null,
      logs: payload.logs ?? [],
      message: response.message ?? response.status ?? undefined,
    };
  }
}
