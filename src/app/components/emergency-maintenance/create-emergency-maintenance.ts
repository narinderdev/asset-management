import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { AssetsService } from '../../services/assets.service';
import { CreateEmergencyMaintenancePayload, PmTemplateService } from '../../services/pm-template.service';

interface EmergencyForm {
  assetId: number | null;
  location: string;
  failureDescription: string;
  failureTime: string;
  reporter: string;
  sendNotification: boolean;
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
  isEditMode = false;
  editId?: string;

  form: EmergencyForm = {
    assetId: null,
    location: '',
    failureDescription: '',
    failureTime: new Date().toISOString().split('.')[0],
    reporter: '',
    sendNotification: true
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private assetsService: AssetsService,
    private pmTemplateService: PmTemplateService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
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
      sendNotification: this.form.sendNotification
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
          sendNotification: true
        };
      },
      error: () => {
        this.errorMessage = 'Unable to load emergency incident.';
      }
    });
  }
}
