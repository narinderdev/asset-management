import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { ServiceRequestService, ServiceRequestsApiResponse } from '../../services/service-request.service';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { Loader } from '../loader/loader';

type PriorityLabel = 'Critical' | 'High' | 'Medium' | 'Low';

interface ServiceRequest {
  apiId?: string;
  requestId: string;
  requestDate: string;
  requester: string;
  shortTitle: string;
  maintenanceType: string;
  priority: PriorityLabel;
  status: string;
  department?: string;
  maintenanceTeam?: string;
}

interface ApiServiceRequest {
  id?: number | string;
  requestId?: string;
  requestDate?: string;
  requesterName?: string;
  shortTitle?: string;
  maintenanceType?: string;
  priority?: string;
  status?: string;
  department?: string;
  maintenanceTeam?: string;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  CONVERTED_TO_WO: 'Converted to WO',
  REJECTED: 'Rejected'
};

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent, Loader],
  templateUrl: './service-requests.html',
  styleUrls: ['./service-requests.css']
})
export class ServiceRequestsComponent implements OnInit {
  serviceRequests: ServiceRequest[] = [];
  totalRequests = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage?: string;
  isDeleteModalOpen = false;
  requestToDelete?: ServiceRequest;
  isDeleting = false;
  isConvertModalOpen = false;
  requestToConvert?: ServiceRequest;
  isConverting = false;
  canCreateRequests = false;
  canEditRequests = false;
  canDeleteRequests = false;
  showEmptyState = false;

  constructor(
    private router: Router,
    private serviceRequestService: ServiceRequestService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadRequests();
  }

  private setPermissions(): void {
    this.canCreateRequests = this.permissionService.hasPermission('SERVICE_REQUEST', 'CREATE');
    this.canEditRequests = this.permissionService.hasPermission('SERVICE_REQUEST', 'UPDATE');
    this.canDeleteRequests = this.permissionService.hasPermission('SERVICE_REQUEST', 'DELETE');
  }

  private loadRequests(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.hasLoaded = false;
    this.showEmptyState = false;
    this.errorMessage = undefined;
    // Clear previous data to avoid showing stale rows while a fresh load is in progress.
    this.serviceRequests = [];

    this.serviceRequestService
      .fetchRequests(pageIndex, this.itemsPerPage)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.hasLoaded = true;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: ServiceRequestsApiResponse) => {
          const content = response.data?.content ?? [];
          this.serviceRequests = content.map((request: ApiServiceRequest) =>
            this.mapRequest(request)
          );
          this.showEmptyState = this.serviceRequests.length === 0;
          this.totalRequests = response.data?.totalElements ?? this.serviceRequests.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          const apiPage = response.data?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = undefined;
          this.serviceRequests = [];
          this.showEmptyState = true;
          this.totalRequests = 0;
          this.toastr.error('Unable to load service requests. Please try again later.');
          this.cdr.detectChanges();
        }
      });
  }

  private mapRequest(data: ApiServiceRequest): ServiceRequest {
    return {
      apiId: data.id !== undefined ? String(data.id) : undefined,
      requestId: data.requestId ?? '—',
      requestDate: this.formatDate(data.requestDate),
      requester: data.requesterName ?? 'Unknown',
      shortTitle: data.shortTitle ?? '—',
      maintenanceType: this.prettify(data.maintenanceType),
      priority: this.normalizePriority(data.priority),
      status: this.formatStatus(data.status),
      department: data.department,
      maintenanceTeam: data.maintenanceTeam
    };
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private prettify(text?: string): string {
    if (!text) {
      return '—';
    }
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private formatStatus(value?: string): string {
    const normalized = value?.toUpperCase() ?? 'NEW';
    return STATUS_LABELS[normalized] ?? this.prettify(value);
  }

  private normalizePriority(value?: string): ServiceRequest['priority'] {
    const upper = value?.toUpperCase() ?? '';
    if (upper === 'CRITICAL') {
      return 'Critical';
    }
    if (upper === 'HIGH') {
      return 'High';
    }
    if (upper === 'MEDIUM') {
      return 'Medium';
    }
    return 'Low';
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadRequests();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadRequests();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRequests / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalRequests) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalRequests) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalRequests);
  }

  createServiceRequest(): void {
    if (!this.canCreateRequests) {
      return;
    }
    this.router.navigate(['/service-requests/create']);
  }

  viewRequest(request: ServiceRequest): void {
    const identifier = this.getRequestIdentifier(request);
    if (!identifier) {
      console.warn('Missing identifier for service request', request);
      return;
    }

    this.serviceRequestService.fetchVoiceAiIntakeTranscripts().subscribe({
      error: () => {
        this.toastr.warning('Could not load voice intake transcripts.');
      }
    });

    this.router.navigate(['/service-requests/view', identifier]);
  }

  convertToWorkOrder(request: ServiceRequest): void {
    if (request.status === 'Converted to WO') {
      return;
    }
    this.requestToConvert = request;
    this.isConvertModalOpen = true;
  }

  editRequest(request: ServiceRequest): void {
    if (!this.canEditRequests) {
      return;
    }
    console.log('Editing service request', this.getRequestIdentifier(request));
    const id = this.getRequestIdentifier(request);
    if (!id) {
      return;
    }
    this.router.navigate(['/service-requests/edit', id]);
  }

  deleteRequest(request: ServiceRequest): void {
    if (!this.canDeleteRequests) {
      return;
    }
    this.requestToDelete = request;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.requestToDelete = undefined;
    this.isDeleting = false;
  }

  closeConvertModal(): void {
    this.isConvertModalOpen = false;
    this.requestToConvert = undefined;
    this.isConverting = false;
  }

  confirmDelete(): void {
    if (!this.canDeleteRequests || !this.requestToDelete) {
      return;
    }
    const identifier = this.getRequestIdentifier(this.requestToDelete);
    if (!identifier) {
      return;
    }

    this.isDeleting = true;
    this.serviceRequestService.deleteRequest(identifier).subscribe({
      next: () => {
        this.toastr.success('Service request deleted successfully.');
        console.log('Deleted request', identifier);
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadRequests();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Unable to delete service request. Please try again.');
        this.isDeleting = false;
        this.errorMessage = 'Unable to delete service request. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  confirmConvert(): void {
    if (!this.requestToConvert) {
      return;
    }
    const identifier = this.getRequestIdentifier(this.requestToConvert);
    if (!identifier) {
      return;
    }

    this.isConverting = true;
    this.serviceRequestService.convertToWorkOrder(identifier).subscribe({
      next: () => {
        this.toastr.success('Service request converted to work order.');
        this.closeConvertModal();
        this.loadRequests();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Unable to convert service request. Please try again.');
        this.isConverting = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getRequestIdentifier(request: ServiceRequest): string | undefined {
    return request.apiId || request.requestId;
  }

  getPriorityClass(priority: ServiceRequest['priority']): string {
    switch (priority) {
      case 'Critical':
        return 'priority-critical';
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      case 'Low':
        return 'priority-low';
      default:
        return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'New':
        return 'status-new';
      case 'Under Review':
        return 'status-under-review';
      case 'Converted to WO':
        return 'status-converted';
      case 'Rejected':
        return 'status-rejected';
      case 'Approved':
        return 'status-approved';
      default:
        return '';
    }
  }
}
