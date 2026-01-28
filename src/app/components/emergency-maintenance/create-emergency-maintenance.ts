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
  plannedStartDateTime: string;
  plannedEndDateTime: string;
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
  assetOptions: Array<{ id: number; label: string }> = [];
  technicianOptions: Array<{ id: number; name: string }> = [];
  teamOptions: Array<{ id: number; name: string }> = [];
  inventoryOptions: Array<{ id: number; name: string }> = [];
  isEditMode = false;
  editId?: string;

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
    plannedStartDateTime: '',
    plannedEndDateTime: '',
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
      plannedStartDateTime: this.form.plannedStartDateTime || undefined,
      plannedEndDateTime: this.form.plannedEndDateTime || undefined,
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
          .map(asset => ({
            id: asset.id as number,
            label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`
          }));
      },
      error: () => {
        this.assetOptions = [];
      }
    });
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
          plannedStartDateTime: incident.workOrder?.plannedStartDateTime ?? '',
          plannedEndDateTime: incident.workOrder?.plannedEndDateTime ?? '',
          planner: incident.workOrder?.planner ?? '',
          preCheckNotes: incident.workOrder?.preCheckNotes ?? '',
          plannedMaterials: []
        };
      },
      error: () => {
        this.errorMessage = 'Unable to load emergency incident.';
      }
    });
  }
}
