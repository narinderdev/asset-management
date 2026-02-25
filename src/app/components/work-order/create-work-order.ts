import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  WorkOrderService,
  CreateWorkOrderRequest,
  WorkOrderDetailResponse,
  WorkOrderType
} from '../../services/work-order.service';
import type { WorkOrder } from '../work-order-table/work-order-table';
import { AssetsService } from '../../services/assets.service';
import { NewWorkOrderHighlightService } from '../../services/new-work-order-highlight.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-create-work-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-work-order.html',
  styleUrls: ['./create-work-order.css']
})
export class CreateWorkOrderComponent implements OnInit {
  dateToday = new Date().toISOString().split('T')[0];
  assetsLoading = false;
  isEditMode = false;
  workOrderId?: string;
  isLoading = false;

  workOrder = {
    assetId: null as number | null,
    assetName: '',
    assetSerialNumber: '',
    assetModelNumber: '',
    assetManufactureDate: '',
    location: '',
    workType: '',
    priority: '',
    woTitle: '',
    descriptionScope: '',
    targetCompletionDate: this.dateToday,
    attachmentUrl: '',
    attachmentFile: null as File | null,
    workRequestTypeCode: '',
    workOrderTypeId: null as number | null,
    glAccount: '',
    utilityAccount: ''
  };

  isSubmitting = false;

  assetOptions: Array<{ id: number; label: string; locationText?: string }> = [];
  private assetOptionMap: Record<number, { id: number; label: string; locationText?: string }> = {};
  priorityOptions = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];
  workTypeOptions = [
    { label: 'Corrective', value: 'CORRECTIVE' },
    { label: 'Preventive', value: 'PREVENTIVE' },
    { label: 'Inspection', value: 'INSPECTION' },
    { label: 'Emergency', value: 'EMERGENCY' }
  ];
  workRequestTypeCodeOptions = ['CM', 'PM', 'EM', 'IN'];
  workOrderTypeOptions: Array<WorkOrderType & { label: string }> = [];
  selectedWorkOrderTypeCreateAsset = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private workOrderService: WorkOrderService,
    private assetsService: AssetsService,
    private newWorkOrderHighlightService: NewWorkOrderHighlightService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAssets();
    this.loadWorkOrderTypes();
    this.workOrderId = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (this.workOrderId) {
      this.isEditMode = true;
      this.fetchWorkOrder(this.workOrderId);
    }
  }

  onCancel(): void {
    this.router.navigate(['/work-orders']);
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.workOrder.attachmentFile = file;
    this.workOrder.attachmentUrl = file ? file.name : '';
  }

  private loadAssets(): void {
    this.assetsLoading = true;
    this.assetsService.fetchAssets(0, 50).subscribe({
      next: (response) => {
        const content = response?.data?.content ?? [];
        this.assetOptions = content
          .filter((asset) => asset.id && (asset.assetName || asset.assetId))
          .map((asset) => ({
            id: asset.id as number,
            label: (asset.assetName || asset.assetId || `Asset #${asset.id}`) as string,
            locationText: this.extractLocation(asset.location)
          }));
        this.assetOptionMap = this.assetOptions.reduce((acc, cur) => {
          acc[cur.id] = cur;
          return acc;
        }, {} as Record<number, { id: number; label: string; locationText?: string }>);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load assets', error);
        this.assetsLoading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.assetsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCreate(): void {
    const useAssetName = this.selectedWorkOrderTypeCreateAsset;
    const payload: CreateWorkOrderRequest = {
      assetId: useAssetName ? undefined : (this.workOrder.assetId ?? undefined),
      assetName: useAssetName ? (this.workOrder.assetName.trim() || undefined) : undefined,
      assetSerialNumber: useAssetName ? (this.workOrder.assetSerialNumber.trim() || undefined) : undefined,
      assetModelNumber: useAssetName ? (this.workOrder.assetModelNumber.trim() || undefined) : undefined,
      assetManufactureDate: useAssetName ? (this.workOrder.assetManufactureDate || undefined) : undefined,
      location: this.workOrder.location || undefined,
      workType: this.workOrder.workType,
      priority: this.workOrder.priority,
      woTitle: this.workOrder.woTitle,
      descriptionScope: this.workOrder.descriptionScope,
      targetCompletionDate: this.workOrder.targetCompletionDate,
      attachmentUrl: this.workOrder.attachmentUrl || undefined,
      workRequestTypeCode: this.workOrder.workRequestTypeCode || undefined,
      workOrderTypeId: this.workOrder.workOrderTypeId ?? undefined,
      glAccount: this.workOrder.glAccount || undefined,
      utilityAccount: this.workOrder.utilityAccount || undefined
    };

    if (this.isEditMode && this.workOrderId) {
      this.updateWorkOrder(payload, this.workOrderId);
      return;
    }

    this.isSubmitting = true;
    this.workOrderService
      .createWorkOrder(payload)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: unknown) => {
          this.toastr.success('Work order created successfully.');
          const newlyCreatedWorkOrder = this.buildNewlyCreatedWorkOrder(response, payload);
          this.newWorkOrderHighlightService.set(newlyCreatedWorkOrder);
          this.router.navigate(['/work-orders']);
        },
        error: (error) => {
          console.error('Failed to create work order', error);
          this.toastr.error('Unable to create work order. Please try again.');
        }
      });
  }

  onAssetChange(assetId: number | null): void {
    if (this.selectedWorkOrderTypeCreateAsset) {
      return;
    }
    if (!assetId) {
      this.workOrder.location = '';
      this.cdr.detectChanges();
      return;
    }
    const match = this.assetOptionMap[assetId];
    if (match?.locationText) {
      this.workOrder.location = match.locationText;
      this.cdr.detectChanges();
    }
  }

  private updateWorkOrder(payload: CreateWorkOrderRequest, id: string): void {
    this.isSubmitting = true;
    this.workOrderService
      .updateWorkOrder(id, payload)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Work order updated successfully.');
          this.router.navigate(['/work-orders']);
        },
        error: error => {
          console.error('Failed to update work order', error);
          this.toastr.error('Unable to update work order. Please try again.');
        }
      });
  }

  private fetchWorkOrder(id: string): void {
    this.isLoading = true;
    this.workOrderService.fetchWorkOrderById(id).subscribe({
      next: (res: WorkOrderDetailResponse) => {
        const detail = res.data;
        if (detail) {
          this.populateFromDetail(detail);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        console.error('Failed to load work order for edit');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private populateFromDetail(detail: NonNullable<WorkOrderDetailResponse['data']>): void {
    const assetId = detail.assetDbId ?? (detail.assetId ? Number(detail.assetId) : null);
    this.workOrder = {
      assetId: assetId && !Number.isNaN(assetId) ? assetId : null,
      assetName: detail.assetName ?? '',
      assetSerialNumber: detail.assetSerialNumber ?? '',
      assetModelNumber: detail.assetModelNumber ?? '',
      assetManufactureDate: (detail.assetManufactureDate ?? '').slice(0, 10),
      location: detail.location ?? '',
      workType: (detail.workType ?? '').toUpperCase(),
      priority: (detail.priority ?? '').toUpperCase(),
      woTitle: detail.woTitle ?? '',
      descriptionScope: detail.descriptionScope ?? '',
      targetCompletionDate: (detail.targetCompletionDate ?? '').slice(0, 10) || this.dateToday,
      attachmentUrl: detail.beforePhotoUrl || detail.afterPhotoUrl || '',
      attachmentFile: null,
      workRequestTypeCode: detail.workRequestTypeCode ?? '',
      workOrderTypeId: detail.workOrderTypeId ?? null,
      glAccount: detail.glAccount ?? '',
      utilityAccount: detail.utilityAccount ?? ''
    };
    this.cdr.detectChanges();
  }

  private loadWorkOrderTypes(): void {
    this.workOrderService.fetchWorkOrderTypes(0, 100).subscribe({
      next: (res) => {
        const list = res.data?.content ?? [];
        this.workOrderTypeOptions = list
          .filter((item) => item.id && item.workOrderType)
          .map((item) => ({
            id: item.id as number,
            label: (item.workOrderType as string).replace(/_/g, ' '),
            workOrderType: item.workOrderType,
            defaultGlAccount: item.defaultGlAccount,
            defaultUtilityAccount: item.defaultUtilityAccount,
            costTreatment: item.costTreatment,
            laborGlAccount: item.laborGlAccount,
            laborUtilityAccount: item.laborUtilityAccount,
            inventoryGlAccount: item.inventoryGlAccount,
            inventoryUtilityAccount: item.inventoryUtilityAccount,
            createAsset: item.createAsset,
            active: item.active,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          }));
        if (this.workOrder.workOrderTypeId) {
          this.onWorkOrderTypeChange(this.workOrder.workOrderTypeId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load work order types', err);
        this.cdr.detectChanges();
      }
    });
  }

  onWorkOrderTypeChange(selectedId: number | null): void {
    if (!selectedId) {
      this.selectedWorkOrderTypeCreateAsset = false;
      return;
    }
    const match = this.workOrderTypeOptions.find((opt) => opt.id === selectedId);
    if (match) {
      this.selectedWorkOrderTypeCreateAsset = !!match.createAsset;
      this.workOrder.glAccount = match.defaultGlAccount ?? '';
      this.workOrder.utilityAccount = match.defaultUtilityAccount ?? '';
      if (this.selectedWorkOrderTypeCreateAsset) {
        this.workOrder.assetId = null;
        this.workOrder.location = '';
      } else {
        this.workOrder.assetName = '';
        this.workOrder.assetSerialNumber = '';
        this.workOrder.assetModelNumber = '';
        this.workOrder.assetManufactureDate = '';
      }
      this.cdr.detectChanges();
    }
  }

  private extractLocation(raw: any): string {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    return raw.location ?? raw.primaryLocation ?? raw.functionalLocation ?? raw.site ?? '';
  }

  private buildNewlyCreatedWorkOrder(response: unknown, payload: CreateWorkOrderRequest): WorkOrder {
    const source = this.extractCreatedWorkOrderData(response);
    const dueDate = this.firstString(
      source?.['plannedEndDateTime'],
      source?.['targetCompletionDate'],
      payload.targetCompletionDate
    );
    const assignedTeamName = this.firstString(source?.['assignedTeamName']);
    const assignedTechnicianName = this.firstString(source?.['assignedTechnicianName'], source?.['assignedTechnician']);
    const technician = assignedTeamName || assignedTechnicianName || 'Unassigned';

    return {
      id: this.firstString(source?.['workOrderId'], source?.['woId'], source?.['idAsString']) || 'New',
      apiId: this.toOptionalNumber(source?.['id']),
      workOrderNumber: this.firstString(source?.['workOrderNumber'], source?.['workorderNumber']) || '',
      title: this.firstString(source?.['woTitle'], payload.woTitle) || 'Work Order',
      asset: this.firstString(source?.['assetName'], payload.assetName) || 'Unassigned Asset',
      technician,
      technicianBadge: assignedTeamName ? 'Team' : assignedTechnicianName ? 'Technician' : '',
      assignedTeamName,
      assignedTechnicianName,
      dueDate,
      formattedDueDate: this.formatDate(dueDate),
      priority: this.normalizePriority(this.firstString(source?.['priority'], payload.priority)),
      status: this.normalizeStatus(this.firstString(source?.['status']) || 'NEW')
    };
  }

  private extractCreatedWorkOrderData(response: unknown): Record<string, unknown> {
    const res = response as any;
    if (!res) {
      return {};
    }
    if (res.data && typeof res.data === 'object') {
      return res.data as Record<string, unknown>;
    }
    return res as Record<string, unknown>;
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return '';
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private normalizePriority(value?: string): 'High' | 'Medium' | 'Low' {
    switch ((value || '').toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  private normalizeStatus(value?: string): string {
    const status = (value || '').toUpperCase();
    switch (status) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'APPROVED':
        return 'Approved';
      case 'NEW':
        return 'New';
      case 'PENDING':
        return 'Pending';
      case 'CLOSED':
        return 'Closed';
      case 'DRAFT':
        return 'Draft';
      default:
        return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'New';
    }
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
