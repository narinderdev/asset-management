import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { AssetsService } from '../../services/assets.service';
import { InventoryService } from '../../services/inventory.service';
import { TechnicianService, TechnicianListResponse, TechnicianTeamResponse } from '../../services/technician.service';
import { CreateEmergencyMaintenancePayload, PmTemplateService } from '../../services/pm-template.service';
import { WorkOrderService } from '../../services/work-order.service';

interface EmergencyForm {
  assetId: number | null;
  location: string;
  failureDescription: string;
  failureTime: string;
  reporter: string;
  sendNotification: boolean;
  assignmentMode: 'TECHNICIAN' | 'TEAM';
  assignedTechnicianId: number | null;
  assignedTeamId: number | null;
  totalDaysRequired: number;
  totalHoursRequired?: number;
  preferredDate?: string;
  preferredEndDate?: string;
  preferredDateTime?: string;
  plannedStartDateTime: string;
  plannedEndDateTime: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  planner: string;
  preCheckNotes: string;
  plannedMaterials: PlannedMaterial[];
}

interface PlannedMaterial {
  inventoryItemId: number | null;
  quantity: number;
  notes: string;
}

@Component({
  selector: 'app-create-emergency-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-emergency-maintenance.html',
  styleUrls: ['../preventive-maintenance/create-preventive-maintenance.css']
})
export class CreateEmergencyMaintenanceComponent implements OnInit {
  isSubmitting = false;
  errorMessage?: string;
  assetOptions: Array<{ id: number; label: string; locationText?: string }> = [];
  private assetOptionMap: Record<number, { id: number; label: string; locationText?: string }> = {};
  technicianOptions: Array<{ id: number; name: string }> = [];
  teamOptions: Array<{ id: number; name: string }> = [];
  inventoryOptions: Array<{ id: number; name: string }> = [];
  isEditMode = false;
  editId?: string;
  availabilityOptions: Array<{ label: string; start: string; end: string }> = [];
  availabilityDateOptions: Array<{ label: string; value: string; end?: string }> = [];
  selectedAvailabilityIndex?: number;
  availabilityLoading = false;

  form: EmergencyForm = {
    assetId: null,
    location: '',
    failureDescription: '',
    failureTime: new Date().toISOString().split('.')[0],
    reporter: '',
    sendNotification: true,
    assignmentMode: 'TECHNICIAN',
    assignedTechnicianId: null,
    assignedTeamId: null,
    totalDaysRequired: 1,
    totalHoursRequired: undefined,
    preferredDate: undefined,
    preferredEndDate: undefined,
    preferredDateTime: undefined,
    plannedStartDateTime: '',
    plannedEndDateTime: '',
    plannedStartDate: undefined,
    plannedEndDate: undefined,
    plannedStartTime: undefined,
    plannedEndTime: undefined,
    planner: '',
    preCheckNotes: '',
    plannedMaterials: [{ inventoryItemId: null, quantity: 1, notes: '' }]
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private assetsService: AssetsService,
    private technicianService: TechnicianService,
    private inventoryService: InventoryService,
    private pmTemplateService: PmTemplateService,
    private workOrderService: WorkOrderService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
    this.loadTechnicians();
    this.loadTeams();
    this.loadInventory();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editId = id;
      this.loadForEdit(id);
    }
  }

  onCancel(): void {
    this.router.navigate(['/maintenance/emergency']);
  }

  onAssignmentModeChange(mode: 'TECHNICIAN' | 'TEAM'): void {
    this.form.assignmentMode = mode;
    this.form.assignedTechnicianId = null;
    this.form.assignedTeamId = null;
    this.resetAvailabilityState();
  }

  onTechnicianChange(id: number | string | null | undefined): void {
    const parsed = id === null || id === undefined ? null : Number(id);
    this.form.assignedTechnicianId = Number.isNaN(parsed as number) ? null : (parsed as number);
    this.fetchAvailability();
    this.fetchTimeSlots();
  }

  onTeamChange(id: number | string | null | undefined): void {
    const parsed = id === null || id === undefined ? null : Number(id);
    this.form.assignedTeamId = Number.isNaN(parsed as number) ? null : (parsed as number);
    this.fetchAvailability();
    this.fetchTimeSlots();
  }

  onTotalDaysChange(value?: number | string): void {
    if (value !== undefined) {
      if (value === '' || value === null) {
        this.form.totalDaysRequired = 1;
      } else {
        const parsed = Number(value);
        this.form.totalDaysRequired = Number.isNaN(parsed) ? this.form.totalDaysRequired : parsed;
      }
    }
    this.fetchAvailability();
  }

  onTotalHoursChange(value?: number | string): void {
    if (value !== undefined) {
      if (value === '' || value === null) {
        this.form.totalHoursRequired = undefined;
      } else {
        const parsed = Number(value);
        this.form.totalHoursRequired = Number.isNaN(parsed) ? this.form.totalHoursRequired : parsed;
      }
    }
    this.fetchTimeSlots();
  }

  onPreferredDateChange(): void {
    this.form.preferredDateTime = undefined;
    this.form.plannedStartDateTime = '';
    this.form.plannedEndDateTime = '';
    this.form.plannedStartDate = undefined;
    this.form.plannedEndDate = undefined;
    this.form.plannedStartTime = undefined;
    this.form.plannedEndTime = undefined;
    this.selectedAvailabilityIndex = undefined;
    const match = this.availabilityDateOptions.find(o => o.value === this.form.preferredDate);
    this.form.preferredEndDate = match?.end;
    this.fetchTimeSlots();
  }

  onAvailabilitySelected(idx: number | string | null | undefined): void {
    this.selectAvailability(idx);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.form.assetId || !this.form.failureDescription || !this.form.failureTime) {
      this.errorMessage = 'Please fill required fields.';
      return;
    }

    this.errorMessage = undefined;
    this.isSubmitting = true;

    const startParts = this.toDateParts(this.form.plannedStartDateTime || this.form.preferredDateTime);
    const endParts = this.toDateParts(this.form.plannedEndDateTime);

    const payload: CreateEmergencyMaintenancePayload = {
      assetId: this.form.assetId,
      location: this.form.location || undefined,
      failureDescription: this.form.failureDescription,
      failureTime: this.form.failureTime,
      reporter: this.form.reporter || undefined,
      sendNotification: this.form.sendNotification,
      assignedTechnicianId:
        this.form.assignmentMode === 'TECHNICIAN' ? this.form.assignedTechnicianId ?? undefined : undefined,
      assignedTeamId: this.form.assignmentMode === 'TEAM' ? this.form.assignedTeamId ?? undefined : undefined,
      totalDaysRequired: this.form.totalDaysRequired,
      totalHoursRequired: this.form.totalHoursRequired,
      plannedStartDate: this.form.plannedStartDate || this.form.preferredDate || startParts.date,
      plannedEndDate:
        this.form.plannedEndDate ||
        this.form.preferredEndDate ||
        endParts.date ||
        this.form.preferredDate ||
        startParts.date,
      plannedStartTime: this.form.plannedStartTime || startParts.time,
      plannedEndTime: this.form.plannedEndTime || endParts.time,
      planner: this.form.planner || undefined,
      preCheckNotes: this.form.preCheckNotes || undefined,
      plannedMaterials: this.form.plannedMaterials
        .filter((m) => m.inventoryItemId && m.quantity > 0)
        .map((m) => ({
          inventoryItemId: m.inventoryItemId as number,
          quantity: m.quantity,
          notes: m.notes || undefined
        }))
    };

    const request$ = this.isEditMode && this.editId
      ? this.pmTemplateService.createEmergencyMaintenance(payload) // replace when update endpoint available
      : this.pmTemplateService.createEmergencyMaintenance(payload);

    request$.pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Emergency maintenance updated.' : 'Emergency maintenance created.');
        this.router.navigate(['/maintenance/emergency']);
      },
      error: () => {
        this.errorMessage = this.isEditMode ? 'Unable to update emergency maintenance. Please try again.' : 'Unable to create emergency maintenance. Please try again.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  private loadAssets(): void {
    this.assetsService.fetchAssets(0, 100).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: response => {
        const content = response.data?.content ?? [];
        this.assetOptions = content
          .filter(asset => asset.id !== undefined)
          .map(asset => {
            const id = asset.id as number;
            const label = asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`;
            const loc = (asset as any).location;
            const locationText =
              typeof loc === 'string'
                ? loc
                : loc?.location ??
                  loc?.primaryLocation ??
                  loc?.functionalLocation ??
                  loc?.locationName ??
                  (asset as any).locationText ??
                  '';
            const mapped = { id, label, locationText };
            this.assetOptionMap[id] = mapped;
            return mapped;
          });
      },
      error: () => {
        this.assetOptions = [];
      }
    });
  }

  onAssetChange(assetId: number | string | null | undefined): void {
    const parsed = assetId === null || assetId === undefined ? null : Number(assetId);
    this.form.assetId = parsed === null || Number.isNaN(parsed) ? null : parsed;
    if (this.form.assetId && this.assetOptionMap[this.form.assetId]?.locationText) {
      this.form.location = this.assetOptionMap[this.form.assetId].locationText ?? '';
    } else {
      this.form.location = '';
    }
  }

  private loadTechnicians(): void {
    this.technicianService.fetchTechnicians(0, 100).pipe(finalize(() => this.cdr.detectChanges())).subscribe({
      next: (res: TechnicianListResponse) => {
        const list = res.data?.technicians ?? [];
        this.technicianOptions = list
          .filter((t) => t.id)
          .map((t) => {
            const nameCandidate = t.fullName ?? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
            const name = nameCandidate && nameCandidate.length ? nameCandidate : `Technician #${t.id}`;
            return { id: t.id as number, name };
          });
      },
      error: () => {
        this.technicianOptions = [];
      }
    });
  }

  private loadTeams(): void {
    this.technicianService.fetchTechnicianTeams(0, 100).pipe(finalize(() => this.cdr.detectChanges())).subscribe({
      next: (res: TechnicianTeamResponse) => {
        const teams = res.data?.teams ?? [];
        this.teamOptions = teams.filter((t) => t.id).map((t) => ({ id: t.id as number, name: t.teamName ?? `Team #${t.id}` }));
      },
      error: () => {
        this.teamOptions = [];
      }
    });
  }

  private loadInventory(): void {
    this.inventoryService.fetchInventory(0, 100).pipe(finalize(() => this.cdr.detectChanges())).subscribe({
      next: (res: any) => {
        const items = res.data?.content ?? [];
        this.inventoryOptions = items
          .filter((i: { id?: number }) => i.id !== undefined)
          .map((i: { id?: number; itemName?: string; itemId?: string }) => ({
            id: i.id as number,
            name: i.itemName ?? i.itemId ?? `Item #${i.id}`
          }));
      },
      error: () => {
        this.inventoryOptions = [];
      }
    });
  }

  private resetAvailabilityState(): void {
    this.availabilityOptions = [];
    this.availabilityDateOptions = [];
    this.selectedAvailabilityIndex = undefined;
    this.form.preferredDate = undefined;
    this.form.preferredEndDate = undefined;
    this.form.preferredDateTime = undefined;
    this.form.plannedStartDateTime = '';
    this.form.plannedEndDateTime = '';
    this.form.plannedStartDate = undefined;
    this.form.plannedEndDate = undefined;
    this.form.plannedStartTime = undefined;
    this.form.plannedEndTime = undefined;
  }

  private fetchAvailability(): void {
    const payload = this.buildAvailabilityPayload();
    if (!payload) return;
    this.availabilityLoading = true;
    const request$ = this.form.assignmentMode === 'TECHNICIAN'
      ? this.workOrderService.getTechnicianAvailability(payload.technicianId!, payload)
      : this.workOrderService.getTeamAvailability(payload.teamId!, payload);

    request$.pipe(finalize(() => (this.availabilityLoading = false))).subscribe({
      next: (res: any) => {
        const slots: Array<any> = res?.data ?? res ?? [];
        this.availabilityOptions = [];
        this.availabilityDateOptions = [];

        const hasDateRanges = slots.some((s: any) => s?.startDate && s?.endDate && !s?.start);
        if (hasDateRanges) {
          this.availabilityDateOptions = slots
            .filter((s: any) => s.startDate)
            .map((s: any) => ({
              value: s.startDate,
              end: s.endDate || s.startDate,
              label: `${this.formatDateOnly(s.startDate)} - ${this.formatDateOnly(s.endDate || s.startDate)}`
            }));
          if (this.availabilityDateOptions.length) {
            this.form.preferredDate = this.availabilityDateOptions[0].value;
            this.form.preferredEndDate = this.availabilityDateOptions[0].end;
          }
        } else {
          this.availabilityOptions = slots
            .filter((s: any) => s.start && s.end)
            .map((s: any) => ({
              label: this.formatRangeLabel(s.start!, s.end!),
              start: s.start!,
              end: s.end!
            }));
          if (this.availabilityOptions.length) {
            this.selectAvailability(0);
          } else {
            this.resetAvailabilityState();
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.resetAvailabilityState();
        this.cdr.detectChanges();
      }
    });
  }

  private fetchTimeSlots(): void {
    const payload = this.buildTimeSlotsPayload();
    if (!payload) return;
    this.availabilityLoading = true;
    this.workOrderService.getAvailabilityTimeSlots(payload)
      .pipe(finalize(() => (this.availabilityLoading = false)))
      .subscribe({
        next: (res: any) => {
          const slots: Array<{ start?: string; end?: string }> = res?.data ?? res ?? [];
          this.availabilityOptions = slots
            .filter((s) => s.start && s.end)
            .map((s) => ({
              label: this.formatRangeLabel(s.start!, s.end!),
              start: s.start!,
              end: s.end!
            }));
          if (this.availabilityOptions.length) {
            this.selectAvailability(0);
          } else {
            this.selectedAvailabilityIndex = undefined;
            this.form.plannedStartDateTime = '';
            this.form.plannedEndDateTime = '';
            this.form.preferredDateTime = undefined;
            this.form.plannedStartDate = undefined;
            this.form.plannedEndDate = undefined;
            this.form.plannedStartTime = undefined;
            this.form.plannedEndTime = undefined;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.availabilityOptions = [];
          this.selectedAvailabilityIndex = undefined;
          this.form.plannedStartDateTime = '';
          this.form.plannedEndDateTime = '';
          this.form.preferredDateTime = undefined;
          this.form.plannedStartDate = undefined;
          this.form.plannedEndDate = undefined;
          this.form.plannedStartTime = undefined;
          this.form.plannedEndTime = undefined;
          this.cdr.detectChanges();
        }
      });
  }

  private selectAvailability(index: number | string | null | undefined): void {
    const idx = index === null || index === undefined ? NaN : Number(index);
    if (Number.isNaN(idx) || idx < 0 || idx >= this.availabilityOptions.length) {
      this.selectedAvailabilityIndex = undefined;
      this.form.plannedStartDateTime = '';
      this.form.plannedEndDateTime = '';
      this.form.preferredDateTime = undefined;
      this.form.plannedStartDate = undefined;
      this.form.plannedEndDate = undefined;
      this.form.plannedStartTime = undefined;
      this.form.plannedEndTime = undefined;
      return;
    }
    this.selectedAvailabilityIndex = idx;
    const opt = this.availabilityOptions[idx];
    this.form.plannedStartDateTime = opt.start;
    this.form.plannedEndDateTime = opt.end;
    this.form.preferredDateTime = opt.start;
    // Use string split to avoid timezone shifts
    const [startDate, startTimeRaw] = (opt.start || '').split('T');
    const [endDate, endTimeRaw] = (opt.end || '').split('T');
    // Prefer the selected date range for dates; time slots are time-of-day
    this.form.plannedStartDate = this.form.preferredDate || startDate;
    this.form.plannedEndDate = this.form.preferredEndDate || endDate || this.form.preferredDate || startDate;
    this.form.plannedStartTime = startTimeRaw ? startTimeRaw.substring(0, 8) : undefined;
    this.form.plannedEndTime = endTimeRaw ? endTimeRaw.substring(0, 8) : undefined;
  }

  private buildAvailabilityPayload():
    | {
        startDate: string;
        endDate: string;
        daysRequired: number;
        hoursRequired: number;
        teamId?: number;
        technicianId?: number;
      }
    | null {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const days = Math.max(1, this.form.totalDaysRequired ?? 1);
    const payload: {
      startDate: string;
      endDate: string;
      daysRequired: number;
      hoursRequired: number;
      teamId?: number;
      technicianId?: number;
    } = {
      startDate: fmt(today),
      endDate: fmt(end),
      daysRequired: days,
      hoursRequired: 1
    };

    if (this.form.assignmentMode === 'TECHNICIAN') {
      const techId = this.form.assignedTechnicianId;
      if (!techId) return null;
      payload.technicianId = Number(techId);
    } else {
      const teamId = this.form.assignedTeamId;
      if (!teamId) return null;
      payload.teamId = Number(teamId);
    }

    return payload;
  }

  private buildTimeSlotsPayload():
    | {
        startDate: string;
        endDate: string;
        daysRequired: number;
        hoursRequired: number;
        teamId?: number;
        technicianId?: number;
      }
    | null {
    const hours = this.form.totalHoursRequired;
    if (hours === undefined || hours === null || Number(hours) < 1) return null;
    if (!this.form.preferredDate) return null;
    const fmtDate = (d: string | Date) => {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      return dateObj.toISOString().slice(0, 10);
    };
    const startDate = fmtDate(this.form.preferredDate);
    const endDate = fmtDate(this.form.preferredEndDate || this.form.preferredDate);
    const days = Math.max(1, this.form.totalDaysRequired ?? 1);
    const payload: {
      startDate: string;
      endDate: string;
      daysRequired: number;
      hoursRequired: number;
      teamId?: number;
      technicianId?: number;
    } = {
      startDate,
      endDate,
      daysRequired: days,
      hoursRequired: Number(hours)
    };

    if (this.form.assignmentMode === 'TECHNICIAN') {
      const techId = this.form.assignedTechnicianId;
      if (!techId) return null;
      payload.technicianId = Number(techId);
    } else {
      const teamId = this.form.assignedTeamId;
      if (!teamId) return null;
      payload.teamId = Number(teamId);
    }

    return payload;
  }

  private formatRangeLabel(startIso: string, endIso: string): string {
    const fmtTime = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    return `${fmtTime(startIso)} - ${fmtTime(endIso)}`;
  }

  private formatDateOnly(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private toDateParts(isoLike?: string): { date?: string; time?: string } {
    if (!isoLike) return {};
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return {};
    const iso = d.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
  }

  addMaterial(): void {
    this.form.plannedMaterials.push({ inventoryItemId: null, quantity: 1, notes: '' });
  }

  removeMaterial(index: number): void {
    if (this.form.plannedMaterials.length === 1) {
      this.form.plannedMaterials[0] = { inventoryItemId: null, quantity: 1, notes: '' };
      return;
    }
    this.form.plannedMaterials.splice(index, 1);
  }

  private loadForEdit(id: string): void {
    this.pmTemplateService.fetchEmergencyMaintenanceById(id).pipe(
      finalize(() => this.cdr.detectChanges())
    ).subscribe({
      next: response => {
        const incident = response.data;
        if (!incident) {
          this.errorMessage = response.message ?? 'Unable to load emergency incident.';
          return;
        }
        const wo: any = (incident as any).workOrder ?? {};
        this.form = {
          assetId: incident.assetId ?? null,
          location: incident.location ?? '',
          failureDescription: incident.failureDescription ?? '',
          failureTime: incident.failureTime ?? '',
          reporter: incident.reporter ?? '',
          sendNotification: true,
          assignmentMode: incident.workOrder && incident.workOrder.assignedTeamId ? 'TEAM' : 'TECHNICIAN',
          assignedTechnicianId: incident.workOrder?.assignedTechnicianId ?? null,
          assignedTeamId: incident.workOrder?.assignedTeamId ?? null,
          totalDaysRequired: wo.totalDaysRequired ?? this.form.totalDaysRequired,
          totalHoursRequired: wo.totalHoursRequired ?? this.form.totalHoursRequired,
          preferredDate: wo.plannedStartDateTime?.split('T')?.[0] ?? this.form.preferredDate,
          preferredEndDate: wo.plannedEndDateTime?.split('T')?.[0] ?? this.form.preferredEndDate,
          plannedStartDateTime: wo.plannedStartDateTime ?? '',
          plannedEndDateTime: wo.plannedEndDateTime ?? '',
          plannedStartDate: wo.plannedStartDateTime ? wo.plannedStartDateTime.split('T')?.[0] : undefined,
          plannedEndDate: wo.plannedEndDateTime ? wo.plannedEndDateTime.split('T')?.[0] : undefined,
          plannedStartTime: wo.plannedStartDateTime ? wo.plannedStartDateTime.split('T')?.[1]?.substring(0, 8) : undefined,
          plannedEndTime: wo.plannedEndDateTime ? wo.plannedEndDateTime.split('T')?.[1]?.substring(0, 8) : undefined,
          planner: incident.workOrder?.planner ?? '',
          preCheckNotes: incident.workOrder?.preCheckNotes ?? '',
          plannedMaterials: []
        };
        if (this.form.assetId) {
          this.onAssetChange(this.form.assetId);
        }
        this.fetchAvailability();
        this.fetchTimeSlots();
      },
      error: () => {
        this.errorMessage = 'Unable to load emergency incident.';
      }
    });
  }
}
