import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  WorkOrderService,
  WorkOrderDetailResponse,
  ApproveWorkOrderRequest,
  ScheduleWorkOrderRequest,
  PlannedMaterialPayload,
  StartInProgressRequest,
  CheckInRequest,
  CheckOutRequest,
  CompleteWorkOrderRequest,
  CompleteLaborEntry,
  CompleteMaterialUsed
} from '../../services/work-order.service';
import { TechnicianService, ApiTechnician, TechnicianTeam } from '../../services/technician.service';
import { InventoryService } from '../../services/inventory.service';

type WorkOrderDetail = NonNullable<WorkOrderDetailResponse['data']>;

@Component({
  standalone: true,
  selector: 'app-view-work-order',
  imports: [CommonModule, FormsModule],
  templateUrl: './view-work-order.html',
  styleUrls: ['./view-work-order.css']
})
export class ViewWorkOrderComponent implements OnInit {
  private workOrderId: string | null = null;
  workOrder?: WorkOrderDetail;
  technicianContext = false;
  isLoading = false;
  errorMessage?: string;
  isApproving = false;
  showApproveModal = false;
  approveError?: string;
  approveForm: ApproveWorkOrderRequest = {
    approvedBy: '',
    estimatedLaborHours: 0,
    estimatedMaterialCost: 0,
    approvalNotes: ''
  };
  showScheduleModal = false;
  scheduleError?: string;
  isScheduling = false;
  scheduleForm: ScheduleWorkOrderRequest = {
    assignedTechnicianId: undefined,
    plannedStartDateTime: '',
    plannedEndDateTime: '',
    planner: '',
    preCheckNotes: '',
    plannedMaterials: []
  };
  plannedMaterials: PlannedMaterialPayload[] = [];
  newMaterial: PlannedMaterialPayload = {
    inventoryItemId: 0,
    quantity: 1,
    uom: '',
    notes: ''
  };
  assignmentMode: 'TECHNICIAN' | 'TEAM' = 'TECHNICIAN';
  technicianOptions: ApiTechnician[] = [];
  teamOptions: TechnicianTeam[] = [];
  selectedTechnicianId?: number;
  selectedTeamId?: number;
  inventoryOptions: Array<{ id: number; name: string; code?: string; uom?: string }> = [];
  selectedInventoryId?: number;
  selectedInventoryCode = '';
  isMarkingInProgress = false;
  inProgressError?: string;
  isClockingIn = false;
  isClockingOut = false;
  clockingError?: string;
  isPausing = false;
  isPaused = false;
  isCheckedIn = false;
  checkInDisabledUntilTomorrow = false;
  hasClockedIn = false;
  showCompleteModal = false;
  isCompleting = false;
  isClosing = false;
  completeError?: string;
  closeError?: string;
  completeForm: CompleteWorkOrderRequest = {
    completionNotes: '',
    failureCause: '',
    remedyAction: '',
    afterPhotoUrl: '',
    laborEntries: [],
    materialsUsed: []
  };
  newLabor: CompleteLaborEntry = { technicianId: undefined, laborHours: undefined, hourlyRate: undefined, laborDate: '', notes: '' };
  newMaterialUsed: CompleteMaterialUsed = { inventoryItemId: undefined, quantityUsed: undefined, notes: '' };
  prefillMaterialUsed: CompleteMaterialUsed = { inventoryItemId: undefined, quantityUsed: undefined, notes: '' };
  showCloseModal = false;
  closeNotes = '';
  showInProgressConfirm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef,
    private technicianService: TechnicianService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.technicianContext = this.getTechnicianIdFromStorage() !== null;
    this.workOrderId = this.route.snapshot.paramMap.get('id');
    if (!this.workOrderId) {
      this.errorMessage = 'Missing work order identifier.';
      return;
    }

    this.loadWorkOrder(this.workOrderId);
  }

  private loadWorkOrder(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.clockingError = undefined;

    this.workOrderService
      .fetchWorkOrderById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isMarkingInProgress = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          if (response.data) {
            this.workOrder = response.data;
            const logs = response.data.checkLogs ?? [];
            const lastLog = logs.length
              ? (logs[logs.length - 1] as { checkInAt?: string; checkOutAt?: string; pauses?: Array<{ pauseAt?: string; resumeAt?: string | null }> } | undefined)
              : undefined;
            const hasOpenLog = !!lastLog && !lastLog?.['checkOutAt'];
            const lastPause = lastLog?.pauses?.length ? lastLog.pauses[lastLog.pauses.length - 1] : undefined;
            const hasUnresolvedPause = !!lastPause && !lastPause.resumeAt;
            // If there is a checkout today, disallow check-in again until after midnight.
            const lastCheckout = lastLog?.['checkOutAt'] ? new Date(lastLog['checkOutAt']) : undefined;
            const now = new Date();
            this.checkInDisabledUntilTomorrow =
              !!lastCheckout && !Number.isNaN(lastCheckout.getTime()) && lastCheckout.toDateString() === now.toDateString();
            // When no check logs, default to not clocked-in to match API semantics.
            this.hasClockedIn = hasOpenLog;
            this.isPaused = hasUnresolvedPause || (response.data.status ?? '').toUpperCase() === 'PAUSED';
            this.isCheckedIn = hasOpenLog;
          } else {
            this.errorMessage = response.message ?? 'Work order not found.';
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load work order details.';
        }
      });
  }

  private getTechnicianIdFromStorage(): number | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem('technicianId');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  hasCheckedIn(): boolean {
    return this.isCheckedIn;
  }

  formatDate(value?: string): string {
    if (!value) {
      return '--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return '--';
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatEnum(value?: string): string {
    if (!value) {
      return 'N/A';
    }
    return value
      .toString()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  goBack(): void {
    this.router.navigate(['/work-orders']);
  }

  openApproveModal(): void {
    this.approveError = undefined;
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
    this.isApproving = false;
    this.approveError = undefined;
  }

  openScheduleModal(): void {
    this.scheduleError = undefined;
    this.showScheduleModal = true;
    this.loadTechniciansAndTeams();
    this.loadInventory();
  }

  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.isScheduling = false;
    this.scheduleError = undefined;
  }

  openInProgressConfirm(): void {
    this.showInProgressConfirm = true;
    this.inProgressError = undefined;
  }

  cancelInProgressConfirm(): void {
    this.showInProgressConfirm = false;
    this.inProgressError = undefined;
  }

  confirmInProgress(): void {
    this.showInProgressConfirm = false;
    this.quickStartInProgress();
  }

  submitApproval(): void {
    if (!this.workOrder?.id || !this.workOrderId) {
      this.approveError = 'Missing work order id.';
      return;
    }

    this.isApproving = true;
    this.approveError = undefined;

    this.workOrderService
      .approveWorkOrder(this.workOrder.id, this.approveForm)
      .pipe(
        finalize(() => {
          this.isApproving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          if (this.workOrder) {
            this.workOrder = { ...this.workOrder, status: 'APPROVED' };
          }
          this.closeApproveModal();
          this.cdr.detectChanges();
        },
        error: () => {
          this.approveError = 'Failed to approve work order. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  submitSchedule(): void {
    if (!this.workOrder?.id) {
      this.scheduleError = 'Missing work order id.';
      return;
    }

    // If a selection is pending, add it before submit
    if (this.selectedInventoryId) {
      this.addPlannedMaterial();
    }

    if (!this.plannedMaterials.length) {
      this.scheduleError = 'Select an inventory item for planned material.';
      this.cdr.detectChanges();
      return;
    }

    this.scheduleForm.plannedMaterials = this.plannedMaterials;
    this.scheduleForm.assignedTechnicianId =
      this.assignmentMode === 'TECHNICIAN' ? this.selectedTechnicianId : undefined;
    this.scheduleForm.assignedTeamId = this.assignmentMode === 'TEAM' ? this.selectedTeamId : undefined;
    this.isScheduling = true;
    this.scheduleError = undefined;

    this.workOrderService.scheduleWorkOrder(this.workOrder.id, this.scheduleForm).subscribe({
      next: () => {
        this.closeScheduleModal();
        this.router.navigate(['/work-orders']);
      },
      error: () => {
        this.scheduleError = 'Failed to schedule work order. Please try again.';
        this.isScheduling = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isScheduling = false;
        this.cdr.detectChanges();
      }
    });
  }

  addPlannedMaterial(): void {
    if (!this.selectedInventoryId) {
      this.scheduleError = 'Inventory item is required for planned material.';
      this.cdr.detectChanges();
      return;
    }
    const selectedItem = this.inventoryOptions.find((opt) => opt.id === this.selectedInventoryId);
    const material: PlannedMaterialPayload = {
      inventoryItemId: this.selectedInventoryId,
      quantity: this.newMaterial.quantity || 1,
      uom: this.newMaterial.uom || selectedItem?.uom || '',
      notes: this.newMaterial.notes
    };
    if (!material.uom) {
      this.scheduleError = 'UOM is required for planned material.';
      this.cdr.detectChanges();
      return;
    }
    this.scheduleError = undefined;
    this.plannedMaterials = [...this.plannedMaterials, material];
    this.newMaterial = { inventoryItemId: 0, quantity: 1, uom: '', notes: '' };
    this.selectedInventoryId = undefined;
    this.selectedInventoryCode = '';
    this.cdr.detectChanges();
  }

  removePlannedMaterial(index: number): void {
    this.plannedMaterials = this.plannedMaterials.filter((_, i) => i !== index);
  }

  getInventoryName(id?: number): string {
    if (!id) {
      return 'N/A';
    }
    const match = this.inventoryOptions.find((opt) => opt.id === id);
    return match?.name || `Item #${id}`;
  }

  getInventoryCode(id?: number): string {
    if (!id) {
      return '';
    }
    const match = this.inventoryOptions.find((opt) => opt.id === id);
    return match?.code || '';
  }

  getTechnicianName(id?: number): string {
    if (!id) {
      return 'N/A';
    }
    const match = this.technicianOptions.find((tech) => tech.id === id);
    const fullName = match?.fullName || [match?.firstName, match?.lastName].filter(Boolean).join(' ').trim();
    return fullName || `Technician #${id}`;
  }

  private loadTechniciansAndTeams(): void {
    this.technicianService.fetchTechnicians(0, 50).subscribe({
      next: (res) => {
        this.technicianOptions = res.data?.technicians ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        console.warn('Failed to load technicians');
      }
    });

    this.technicianService.fetchTechnicianTeams(0, 50).subscribe({
      next: (res) => {
        this.teamOptions = res.data?.teams ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        console.warn('Failed to load teams');
      }
    });

    this.loadInventory();
  }

  private loadInventory(): void {
    this.inventoryService.fetchInventory(0, 50).subscribe({
      next: (res) => {
        this.inventoryOptions =
          res.data?.content?.map((item) => ({
            id: item.id ?? 0,
            name: item.itemName ?? item.itemId ?? `Item #${item.id}`,
            code: item.itemId,
            uom: item.unitOfMeasure
          })) ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        console.warn('Failed to load inventory items');
      }
    });
  }

  quickStartInProgress(): void {
    if (!this.workOrder?.id || !this.workOrderId) {
      return;
    }
    const payload: StartInProgressRequest = {
      ...this.buildAssignmentPayload()
    };
    this.isMarkingInProgress = true;
    this.inProgressError = undefined;

    this.workOrderService.startInProgress(this.workOrder.id, payload).subscribe({
      next: () => {
        if (this.workOrder) {
          this.workOrder = { ...this.workOrder, status: 'IN_PROGRESS' };
        }
        this.cdr.detectChanges();
        this.loadWorkOrder(this.workOrderId!);
      },
      error: () => {
        this.inProgressError = 'Failed to update status. Please try again.';
        this.isMarkingInProgress = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isMarkingInProgress = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildAssignmentPayload(): Pick<CheckInRequest, 'technicianId' | 'teamId'> {
    const payload: Pick<CheckInRequest, 'technicianId' | 'teamId'> = {};
    if (this.workOrder?.assignedTeamId) {
      payload.teamId = this.workOrder.assignedTeamId;
    } else if (this.workOrder?.assignedTechnicianId) {
      payload.technicianId = this.workOrder.assignedTechnicianId;
    }
    return payload;
  }

  clockIn(): void {
    if (!this.workOrder?.id || !this.workOrderId) {
      return;
    }

    this.clockingError = undefined;
    const assignee = this.buildAssignmentPayload();
    if (!assignee.teamId && !assignee.technicianId) {
      this.clockingError = 'Assignment is required to clock in.';
      return;
    }

    const payload: CheckInRequest = {
      ...assignee,
      checkInAt: new Date().toISOString()
    };

    this.isClockingIn = true;
    this.clockingError = undefined;

    this.workOrderService.checkIn(this.workOrder.id, payload).subscribe({
      next: () => {
        this.hasClockedIn = true;
        this.isCheckedIn = true;
        this.loadWorkOrder(this.workOrderId!);
      },
      error: () => {
        this.clockingError = 'Failed to clock in. Please try again.';
        this.isClockingIn = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isClockingIn = false;
        this.cdr.detectChanges();
      }
    });
  }

  clockOut(): void {
    if (!this.workOrder?.id || !this.workOrderId) {
      return;
    }

    this.clockingError = undefined;
    const assignee = this.buildAssignmentPayload();
    if (!assignee.teamId && !assignee.technicianId) {
      this.clockingError = 'Assignment is required to clock out.';
      return;
    }

    const payload: CheckOutRequest = {
      ...assignee,
      checkOutAt: new Date().toISOString()
    };

    this.isClockingOut = true;
    this.clockingError = undefined;

    this.workOrderService.checkOut(this.workOrder.id, payload).subscribe({
      next: () => {
        this.hasClockedIn = false;
        this.isCheckedIn = false;
        this.loadWorkOrder(this.workOrderId!);
      },
      error: () => {
        this.clockingError = 'Failed to clock out. Please try again.';
        this.isClockingOut = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isClockingOut = false;
        this.cdr.detectChanges();
      }
    });
  }

  handleCheckToggle(): void {
    // Toggle between check-in and check-out based on the latest open log.
    if (this.isCheckedIn) {
      this.clockOut();
    } else {
      this.clockIn();
    }
  }

  markComplete(): void {
    this.completeError = undefined;
    this.loadTechniciansAndTeams();
    this.loadInventory();
    const prefilledLabor: CompleteLaborEntry | undefined =
      this.workOrder?.assignedTechnicianName || this.workOrder?.estimatedLaborHours
        ? {
            technicianId: this.workOrder.assignedTechnicianId,
            laborHours: this.workOrder.estimatedLaborHours
          }
        : undefined;
    this.completeForm.laborEntries = prefilledLabor ? [prefilledLabor] : [];
    const firstPlanned = this.workOrder?.plannedMaterials?.[0];
    if (firstPlanned?.inventoryItemId) {
      this.prefillMaterialUsed = {
        inventoryItemId: firstPlanned.inventoryItemId,
        quantityUsed: firstPlanned.quantityPlanned ?? 1,
        notes: firstPlanned.notes ?? ''
      };
    } else {
      this.prefillMaterialUsed = { inventoryItemId: undefined, quantityUsed: undefined, notes: '' };
    }
    this.newMaterialUsed = { inventoryItemId: undefined, quantityUsed: undefined, notes: '' };
    this.cdr.detectChanges();
    this.showCompleteModal = true;
  }

  addLaborEntry(): void {
    if (!this.newLabor.laborHours && this.newLabor.laborHours !== 0) {
      this.completeError = 'Labor hours are required to add a labor entry.';
      return;
    }
    this.completeError = undefined;
    this.completeForm.laborEntries = [...(this.completeForm.laborEntries ?? []), { ...this.newLabor }];
    this.newLabor = { technicianId: undefined, laborHours: undefined, hourlyRate: undefined, laborDate: '', notes: '' };
  }

  removeLaborEntry(idx: number): void {
    this.completeForm.laborEntries = (this.completeForm.laborEntries ?? []).filter((_, i) => i !== idx);
  }

  addMaterialUsed(material: CompleteMaterialUsed = this.newMaterialUsed): void {
    if (!material.inventoryItemId || !material.quantityUsed) {
      this.completeError = 'Inventory item and quantity used are required.';
      return;
    }
    this.completeError = undefined;
    this.completeForm.materialsUsed = [...(this.completeForm.materialsUsed ?? []), { ...material }];
    this.newMaterialUsed = { inventoryItemId: undefined, quantityUsed: undefined, notes: '' };
  }

  removeMaterialUsed(idx: number): void {
    this.completeForm.materialsUsed = (this.completeForm.materialsUsed ?? []).filter((_, i) => i !== idx);
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    this.isCompleting = false;
    this.completeError = undefined;
  }

  openCloseModal(): void {
    this.closeError = undefined;
    this.showCloseModal = true;
  }

  closeCloseModal(): void {
    this.showCloseModal = false;
    this.isClosing = false;
    this.closeError = undefined;
    this.closeNotes = '';
  }

  onBeforePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.completeForm.beforePhotoUrl = file.name;
    } else {
      this.completeForm.beforePhotoUrl = '';
    }
  }

  onAfterPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.completeForm.afterPhotoUrl = file.name;
    } else {
      this.completeForm.afterPhotoUrl = '';
    }
  }

  submitCompletion(): void {
    if (!this.workOrder?.id || !this.workOrderId) {
      this.completeError = 'Missing work order id.';
      return;
    }

    // default actual end to now if missing
    const payload: CompleteWorkOrderRequest = {
      ...this.completeForm,
      actualEndDateTime: this.completeForm.actualEndDateTime || new Date().toISOString(),
      actualStartDateTime: this.completeForm.actualStartDateTime || this.workOrder.actualStartDateTime
    };

    this.isCompleting = true;
    this.completeError = undefined;

    this.workOrderService.completeWorkOrder(this.workOrder.id, payload).subscribe({
      next: () => {
        this.closeCompleteModal();
        this.loadWorkOrder(this.workOrderId!);
      },
      error: () => {
        this.completeError = 'Failed to complete work order. Please try again.';
        this.isCompleting = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isCompleting = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeWorkOrder(): void {
    if (!this.workOrder?.id) {
      return;
    }
    this.isClosing = true;
    this.closeError = undefined;
    this.workOrderService.closeWorkOrder(this.workOrder.id, { supervisorNotes: this.closeNotes }).subscribe({
      next: () => this.router.navigate(['/work-orders']),
      error: () => {
        this.closeError = 'Failed to close work order.';
        this.isClosing = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isClosing = false;
        this.showCloseModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  pauseWorkOrder(): void {
    if (!this.workOrder?.id) {
      return;
    }
    this.isPausing = true;
    const id = this.workOrder.id;
    const action$ = this.isPaused
      ? this.workOrderService.resumeWorkOrder(id)
      : this.workOrderService.pauseWorkOrder(id);

    action$.pipe(
      finalize(() => {
        this.isPausing = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        // Flip local state immediately so the button text updates, then refresh from API.
        this.isPaused = !this.isPaused;
        this.isPausing = false;
        this.cdr.detectChanges();
        this.loadWorkOrder(this.workOrderId!);
      },
      error: () => {
        this.toastrError('Unable to update work order status. Please try again.');
      }
    });
  }

  private toastrError(message: string): void {
    // Toast service not injected here; fallback to errorMessage and console
    this.errorMessage = message;
    console.error(message);
  }
}

