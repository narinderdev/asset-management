import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  ServiceRequestService,
  ServiceRequestCreatePayload,
  ServiceRequestDetailResponse
} from '../../services/service-request.service';
import { AssetsService } from '../../services/assets.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-service-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-service-request.html',
  styleUrls: ['./create-service-request.css']
})
export class CreateServiceRequestComponent implements OnInit {
  dateToday = new Date().toISOString().split('T')[0];
  request = {
    requestId: '',
    requestDate: this.dateToday,
    requesterName: '',
    requesterContact: '',
    department: '',
    asset: '',
    location: '',
      maintenanceType: '',
      priority: '',
    shortTitle: '',
    problemDescription: '',
    preferredDate: this.dateToday,
    preferredTime: '',
    status: '',
    safetyRisk: false,
    attachmentUrl: ''
  };
  autoGenerateRequestId = false;

  departmentOptions = ['Production', 'Engineering', 'Facilities'];
  assetOptions: Array<{ id: string; label: string }> = [];
  private assetOptionMap: Record<string, { id: string; label: string; locationText?: string; department?: string; costCenter?: string; assignedOwner?: string; maintenanceTeam?: string }> = {};
  maintenanceOptions = [
    { value: 'CORRECTIVE', label: 'Corrective' },
    { value: 'PREVENTIVE', label: 'Preventive' },
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'INSPECTION', label: 'Inspection' }
  ];
  priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];
  statusOptions = [
    { label: 'New', value: 'NEW' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Converted to WO', value: 'CONVERTED_TO_WO' },
    { label: 'Rejected', value: 'REJECTED' }
  ];
  isSubmitting = false;
  errorMessage?: string;
  isEditMode = false;
  editRequestId?: string;
  isLoadingDetails = false;
  hasLoadedDetails = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private serviceRequestService: ServiceRequestService,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAssetOptions();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.hasLoadedDetails = true;
      return;
    }

    this.isEditMode = true;
    this.editRequestId = id;
    this.hasLoadedDetails = false;
    this.loadRequest(id);
  }

  onCancel(): void {
    this.router.navigate(['/service-requests']);
  }

  onAutoGenerateRequestIdChange(): void {
    if (this.autoGenerateRequestId) {
      this.request.requestId = '';
    }
  }

  private loadRequest(id: string): void {
    this.isLoadingDetails = true;
    this.errorMessage = undefined;
    this.hasLoadedDetails = false;

    this.serviceRequestService
      .fetchRequestById(id)
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const payload = response as ServiceRequestDetailResponse;
          if (payload.data) {
            this.populateFromDetail(payload.data);
            this.hasLoadedDetails = true;
          } else {
            this.errorMessage = payload.message ?? 'Unable to load service request for editing.';
            this.hasLoadedDetails = true;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load service request for editing.';
          this.hasLoadedDetails = true;
          this.cdr.detectChanges();
        }
      });
  }

  onCreate(): void {
    if (this.isEditMode && this.isLoadingDetails) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;

    const payload = this.buildPayload();
    const operation = this.isEditMode && this.editRequestId
      ? this.serviceRequestService.updateRequest(this.editRequestId, payload)
      : this.serviceRequestService.createRequest(payload);

    const successMessage = this.isEditMode
      ? 'Service request updated successfully.'
      : 'Service request created successfully.';
    const failureMessage = this.isEditMode
      ? 'Unable to update service request. Please try again.'
      : 'Unable to create service request. Please try again.';

    operation
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          this.toastr.success(successMessage);
          this.router.navigate(['/service-requests']);
        },
        error: () => {
          this.errorMessage = failureMessage;
          this.toastr.error(failureMessage);
        }
      });
  }

  private buildPayload(): ServiceRequestCreatePayload {
    const payload: ServiceRequestCreatePayload = {
      requesterName: this.request.requesterName,
      requesterContact: this.request.requesterContact,
      department: this.request.department,
      location: this.request.location,
      maintenanceType: this.request.maintenanceType.toUpperCase(),
      priority: this.request.priority.toUpperCase(),
      shortTitle: this.request.shortTitle,
      problemDescription: this.request.problemDescription,
      preferredDate: this.request.preferredDate,
      preferredTime: this.request.preferredTime,
      safetyRisk: this.request.safetyRisk,
      attachmentUrl: this.request.attachmentUrl,
      status: this.request.status
    };

    if (!this.autoGenerateRequestId && this.request.requestId) {
      payload.requestId = this.request.requestId;
    }

    if (this.assetOptions.length && this.request.asset) {
      const parsed = Number(this.request.asset);
      if (!Number.isNaN(parsed)) {
        payload.assetId = parsed;
      }
    }

    return payload;
  }

  private populateFromDetail(detail: NonNullable<ServiceRequestDetailResponse['data']>): void {
    this.autoGenerateRequestId = false;

    this.request = {
      ...this.request,
      requestId: detail.requestId ?? '',
      requestDate: detail.requestDate ? detail.requestDate.split('T')[0] : this.dateToday,
      requesterName: detail.requesterName ?? '',
      requesterContact: detail.requesterContact ?? '',
      department: detail.department ?? '',
      asset: detail.assetDbId?.toString() ?? '',
      location: detail.location ?? '',
      maintenanceType: detail.maintenanceType ?? '',
      priority: detail.priority ?? '',
      shortTitle: detail.shortTitle ?? '',
      problemDescription: detail.problemDescription ?? detail.description ?? '',
      preferredDate: detail.preferredDate ?? this.dateToday,
      preferredTime: detail.preferredTime ?? '',
      status: detail.status ?? '',
      safetyRisk: detail.safetyRisk ?? false,
      attachmentUrl: detail.attachmentUrl ?? ''
    };
  }

  private loadAssetOptions(): void {
    this.assetsService
      .fetchAssets(0, 100)
      .pipe(finalize(() => {
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.assetOptions = content
            .filter(asset => asset.id !== undefined)
            .map(asset => {
              const loc = asset.location as any;
              const locationText =
                typeof loc === 'string'
                  ? loc
                  : loc?.location ?? loc?.primaryLocation ?? loc?.functionalLocation ?? '';
              return {
                id: String(asset.id),
                label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`,
                locationText,
                department: loc?.department ?? '',
                costCenter: loc?.costCenter ?? '',
                assignedOwner: loc?.assignedOwner ?? '',
                maintenanceTeam: loc?.maintenanceTeam ?? ''
              };
            });
          this.assetOptionMap = this.assetOptions.reduce((acc, opt) => {
            acc[opt.id] = opt;
            return acc;
          }, {} as Record<string, { id: string; label: string; locationText?: string; department?: string; costCenter?: string; assignedOwner?: string; maintenanceTeam?: string }>);
          if (this.request.asset) {
            this.applyAssetLocationFromSelection(this.request.asset);
          }
        },
        error: () => {
          this.assetOptions = [];
        }
      });
  }

  onAssetChange(assetId: string): void {
    this.request.asset = assetId;
    this.applyAssetLocationFromSelection(assetId);
  }

  private applyAssetLocationFromSelection(assetId: string): void {
    const match = this.assetOptionMap[assetId];
    if (match) {
      this.request.location = match.locationText ?? '';
      if (match.department) {
        this.request.department = match.department;
      }
    }
  }
}
