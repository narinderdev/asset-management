import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkOrderService, CreateWorkOrderRequest, WorkOrderDetailResponse } from '../../services/work-order.service';
import { AssetsService } from '../../services/assets.service';
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
    location: '',
    workType: '',
    priority: '',
    woTitle: '',
    descriptionScope: '',
    targetCompletionDate: this.dateToday,
    attachmentUrl: '',
    attachmentFile: null as File | null
  };

  isSubmitting = false;

  assetOptions: Array<{ id: number; label: string }> = [];
  workTypeOptions = ['Corrective', 'Preventive', 'Inspection', 'Emergency'];
  priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private workOrderService: WorkOrderService,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAssets();
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
            label: (asset.assetName || asset.assetId || `Asset #${asset.id}`) as string
          }));
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
    const payload: CreateWorkOrderRequest = {
      assetId: this.workOrder.assetId ?? undefined,
      location: this.workOrder.location || undefined,
      workType: this.workOrder.workType,
      priority: this.workOrder.priority,
      woTitle: this.workOrder.woTitle,
      descriptionScope: this.workOrder.descriptionScope,
      targetCompletionDate: this.workOrder.targetCompletionDate,
      attachmentUrl: this.workOrder.attachmentUrl || undefined
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
        next: () => {
          this.toastr.success('Work order created successfully.');
          this.router.navigate(['/work-orders']);
        },
        error: (error) => {
          console.error('Failed to create work order', error);
          this.toastr.error('Unable to create work order. Please try again.');
        }
      });
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
      location: detail.location ?? '',
      workType: detail.workType ?? '',
      priority: detail.priority ?? '',
      woTitle: detail.woTitle ?? '',
      descriptionScope: detail.descriptionScope ?? '',
      targetCompletionDate: (detail.targetCompletionDate ?? '').slice(0, 10) || this.dateToday,
      attachmentUrl: detail.beforePhotoUrl || detail.afterPhotoUrl || '',
      attachmentFile: null
    };
    this.cdr.detectChanges();
  }
}
