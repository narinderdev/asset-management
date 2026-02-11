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
import { TechnicianService, ApiTechnician, TechnicianTeam } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';

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
    preferredDateTime: '',
    safetyRisk: false,
    attachmentUrl: '',
    assignmentMode: 'TECHNICIAN' as 'TECHNICIAN' | 'TEAM',
    preferredTechnicianId: undefined as number | undefined,
    preferredTeamId: undefined as number | undefined,
    totalDaysRequired: 1,
    totalHoursRequired: undefined as number | undefined,
    plannedStartDateTime: '',
    plannedEndDateTime: ''
  };
  availabilityOptions: Array<{ label: string; start: string; end: string }> = [];
  availabilityDateOptions: Array<{ label: string; value: string; end?: string }> = [];
  availabilityLoading = false;
  selectedAvailabilityIndex?: number;
  selectedDateEnd?: string;
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
  technicianOptions: ApiTechnician[] = [];
  teamOptions: TechnicianTeam[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private serviceRequestService: ServiceRequestService,
    private assetsService: AssetsService,
    private technicianService: TechnicianService,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAssetOptions();
    this.loadTechniciansAndTeams();
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

  onAssignmentModeChange(mode: 'TECHNICIAN' | 'TEAM'): void {
    this.request.assignmentMode = mode;
    this.request.preferredTechnicianId = undefined;
    this.request.preferredTeamId = undefined;
    this.selectedAvailabilityIndex = undefined;
    this.availabilityOptions = [];
    this.availabilityDateOptions = [];
    this.selectedDateEnd = undefined;
    this.request.plannedStartDateTime = '';
    this.request.plannedEndDateTime = '';
  }

  onTechnicianChange(id: number | string | undefined): void {
    const parsed = id === undefined || id === null ? undefined : Number(id);
    this.request.preferredTechnicianId = Number.isNaN(parsed) ? undefined : parsed;
    this.fetchAvailability();
    this.fetchTimeSlots();
  }

  onTeamChange(id: number | string | undefined): void {
    const parsed = id === undefined || id === null ? undefined : Number(id);
    this.request.preferredTeamId = Number.isNaN(parsed) ? undefined : parsed;
    this.fetchAvailability();
    this.fetchTimeSlots();
  }

  onTotalDaysChange(value?: number | string): void {
    if (value !== undefined) {
      if (value === '' || value === null) {
        this.request.totalDaysRequired = undefined as any;
      } else {
        const parsed = Number(value);
        this.request.totalDaysRequired = Number.isNaN(parsed) ? this.request.totalDaysRequired : parsed;
      }
    }
    this.onDurationChange();
  }

  onTotalHoursChange(value?: number | string): void {
    if (value !== undefined) {
      if (value === '' || value === null) {
        this.request.totalHoursRequired = undefined as any;
      } else {
        const parsed = Number(value);
        this.request.totalHoursRequired = Number.isNaN(parsed) ? this.request.totalHoursRequired ?? undefined : parsed;
      }
    }
    this.fetchTimeSlots();
  }

  private onDurationChange(): void {
    this.fetchAvailability();
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
            .filter(s => s.start && s.end)
            .map(s => ({
              label: this.formatRangeLabel(s.start!, s.end!),
              start: s.start!,
              end: s.end!
            }));
          if (this.availabilityOptions.length) {
            this.selectAvailability(0);
          } else {
            this.selectedAvailabilityIndex = undefined;
            this.request.plannedStartDateTime = '';
            this.request.plannedEndDateTime = '';
            this.request.preferredDateTime = '';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.availabilityOptions = [];
          this.selectedAvailabilityIndex = undefined;
          this.request.plannedStartDateTime = '';
          this.request.plannedEndDateTime = '';
          this.request.preferredDateTime = '';
          this.cdr.detectChanges();
        }
      });
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
    const partsFromIsoString = (iso?: string): { date?: string; time?: string } => {
      if (!iso) return {};
      const [date, timeWithZone] = iso.split('T');
      if (!date) return {};
      const time = (timeWithZone || '').slice(0, 5);
      return { date, time: time || undefined };
    };

    const startParts = partsFromIsoString(this.request.plannedStartDateTime || this.request.preferredDateTime);
    const endParts = partsFromIsoString(this.request.plannedEndDateTime);

    const fallbackDate = this.request.preferredDate || this.dateToday;
    const fallbackTime = this.request.preferredTime || '00:00';

    const startDate = this.request.preferredDate || startParts.date || fallbackDate;
    const endDate = this.selectedDateEnd || endParts.date || startDate;
    const startTime = startParts.time ?? fallbackTime;
    const endTime = endParts.time ?? startTime ?? fallbackTime;

    const payload: ServiceRequestCreatePayload = {
      requesterName: this.request.requesterName,
      requesterContact: this.request.requesterContact,
      department: this.request.department,
      location: this.request.location,
      maintenanceType: this.request.maintenanceType.toUpperCase(),
      priority: this.request.priority.toUpperCase(),
      shortTitle: this.request.shortTitle,
      problemDescription: this.request.problemDescription,
      preferredStartDate: startDate,
      preferredStartTime: startTime,
      preferredEndDate: endDate,
      preferredEndTime: endTime,
      preferredTechnicianId: this.request.assignmentMode === 'TECHNICIAN' ? this.request.preferredTechnicianId : undefined,
      preferredTeamId: this.request.assignmentMode === 'TEAM' ? this.request.preferredTeamId : undefined,
      safetyRisk: this.request.safetyRisk,
      attachmentUrl: this.request.attachmentUrl
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
      preferredDate: (detail as any).preferredDate ?? detail.preferredDateTime?.split('T')?.[0] ?? this.dateToday,
      preferredTime: (detail as any).preferredTime ?? detail.preferredDateTime?.split('T')?.[1]?.slice(0, 5) ?? '',
      preferredDateTime: (detail as any).preferredDateTime ?? '',
      safetyRisk: detail.safetyRisk ?? false,
      attachmentUrl: detail.attachmentUrl ?? '',
      totalDaysRequired: (detail as any).totalDaysRequired ?? this.request.totalDaysRequired,
      totalHoursRequired: (detail as any).totalHoursRequired ?? undefined,
      assignmentMode: (detail as any).preferredTeamId ? 'TEAM' : 'TECHNICIAN',
      preferredTechnicianId: (detail as any).preferredTechnicianId,
      preferredTeamId: (detail as any).preferredTeamId
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

  private loadTechniciansAndTeams(): void {
    this.technicianService.fetchTechnicians(0, 100).subscribe({
      next: res => {
        const list = (res as any)?.data?.technicians ?? (res as any)?.data?.content ?? [];
        this.technicianOptions = (list as ApiTechnician[]).filter(t => t);
        this.cdr.detectChanges();
      },
      error: () => {
        this.technicianOptions = [];
        this.cdr.detectChanges();
      }
    });

    this.technicianService.fetchTechnicianTeams(0, 100).subscribe({
      next: res => {
        this.teamOptions = res?.data?.teams ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.teamOptions = [];
        this.cdr.detectChanges();
      }
    });
  }


  getTechnicianId(tech: any): number | string | undefined {
    return tech?.id ?? tech?.technicianId ?? tech?.employeeId ?? tech?.userId;
  }

  getTechnicianName(tech: any): string {
    const full = tech?.fullName;
    if (full) return full;
    const first = tech?.firstName ?? '';
    const last = tech?.lastName ?? '';
    const combined = `${first} ${last}`.trim();
    if (combined.length) return combined;
    if (tech?.name) return String(tech.name);
    return tech?.email ?? tech?.id ?? 'Technician';
  }

  private fetchAvailability(): void {
    const payload = this.buildAvailabilityPayload();
    if (!payload) return;
    this.availabilityLoading = true;
    const request$ = this.request.assignmentMode === 'TECHNICIAN'
      ? this.workOrderService.getTechnicianAvailability(payload.technicianId!, payload)
      : this.workOrderService.getTeamAvailability(payload.teamId!, payload);

    request$.pipe(finalize(() => (this.availabilityLoading = false))).subscribe({
      next: (res: any) => {
        const slots: Array<any> = res?.data ?? res ?? [];
        this.availabilityOptions = [];
        this.availabilityDateOptions = [];

        const hasDateRanges = slots.some(s => s?.startDate && s?.endDate && !s?.start);
        if (hasDateRanges) {
          this.availabilityDateOptions = slots
            .filter(s => s.startDate)
            .map(s => ({
              value: s.startDate,
              end: s.endDate || s.startDate,
              label: `${this.formatDateOnly(s.startDate)} - ${this.formatDateOnly(s.endDate || s.startDate)}`
            }));
          if (this.availabilityDateOptions.length) {
            this.request.preferredDate = this.availabilityDateOptions[0].value;
            this.selectedDateEnd = this.availabilityDateOptions[0].end;
          }
        } else {
          this.availabilityOptions = slots
            .filter(s => s.start && s.end)
            .map((s) => ({
              label: this.formatRangeLabel(s.start!, s.end!),
              start: s.start!,
              end: s.end!
            }));
          if (this.availabilityOptions.length) {
            this.selectAvailability(0);
          } else {
            this.selectedAvailabilityIndex = undefined;
            this.request.plannedStartDateTime = '';
            this.request.plannedEndDateTime = '';
            this.request.preferredDateTime = '';
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.availabilityOptions = [];
        this.availabilityDateOptions = [];
        this.selectedAvailabilityIndex = undefined;
        this.request.plannedStartDateTime = '';
        this.request.plannedEndDateTime = '';
        this.request.preferredDateTime = '';
        this.cdr.detectChanges();
      }
    });
  }

  onAvailabilitySelected(idx: number | string | null | undefined): void {
    this.selectAvailability(idx);
  }

  onPreferredDateChange(): void {
    this.request.preferredDateTime = '';
    this.request.plannedStartDateTime = '';
    this.request.plannedEndDateTime = '';
    this.selectedAvailabilityIndex = undefined;
    const match = this.availabilityDateOptions.find(o => o.value === this.request.preferredDate);
    this.selectedDateEnd = match?.end;
    this.fetchTimeSlots();
  }

  private selectAvailability(index: number | string | null | undefined): void {
    const idx = index === null || index === undefined ? NaN : Number(index);
    if (Number.isNaN(idx) || idx < 0 || idx >= this.availabilityOptions.length) {
      this.selectedAvailabilityIndex = undefined;
      this.request.plannedStartDateTime = '';
      this.request.plannedEndDateTime = '';
      this.request.preferredDateTime = '';
      return;
    }
    this.selectedAvailabilityIndex = idx;
    const opt = this.availabilityOptions[idx];
    this.request.plannedStartDateTime = opt.start;
    this.request.plannedEndDateTime = opt.end;
    this.request.preferredDateTime = opt.start;
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
    const days = Math.max(1, this.request.totalDaysRequired ?? 1); // user input
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
      hoursRequired: 1 // static per requirement
    };

    if (this.request.assignmentMode === 'TECHNICIAN') {
      const techId = this.request.preferredTechnicianId;
      if (!techId) return null;
      payload.technicianId = Number(techId);
    } else {
      const teamId = this.request.preferredTeamId;
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
    const hours = this.request.totalHoursRequired;
    if (hours === undefined || hours === null || Number(hours) < 1) return null;
    if (!this.request.preferredDate) return null;
    const fmtDate = (d: string | Date) => {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      return dateObj.toISOString().slice(0, 10);
    };
    const startDate = fmtDate(this.request.preferredDate);
    const endDate = fmtDate(this.selectedDateEnd || this.request.preferredDate);
    const days = Math.max(1, this.request.totalDaysRequired ?? 1);
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

    if (this.request.assignmentMode === 'TECHNICIAN') {
      const techId = this.request.preferredTechnicianId;
      if (!techId) return null;
      payload.technicianId = Number(techId);
    } else {
      const teamId = this.request.preferredTeamId;
      if (!teamId) return null;
      payload.teamId = Number(teamId);
    }

    return payload;
  }

  private formatRangeLabel(startIso: string, endIso: string, name?: string): string {
    const fmtTime = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    const label = `${fmtTime(startIso)} - ${fmtTime(endIso)}`;
    return label;
  }

  private formatDateOnly(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
