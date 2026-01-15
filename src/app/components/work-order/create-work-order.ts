import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkOrderService, CreateWorkOrderRequest } from '../../services/work-order.service';
import { AssetsService } from '../../services/assets.service';

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
  workTypeOptions = ['CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'EMERGENCY'];
  priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  constructor(
    private router: Router,
    private workOrderService: WorkOrderService,
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
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

    this.isSubmitting = true;
    this.workOrderService.createWorkOrder(payload).subscribe({
      next: () => {
        this.router.navigate(['/work-orders']);
      },
      error: (error) => {
        console.error('Failed to create work order', error);
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
