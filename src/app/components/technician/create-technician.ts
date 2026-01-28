import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { ApiTechnician, CreateTechnicianPayload, TechnicianService } from '../../services/technician.service';

interface TechnicianForm {
  technicianId: string;
  badgeNumber: string;
  firstName: string;
  lastName: string;
  technicianType: string;
  phoneNumber: string;
  email: string;
  status: string;
  skills: string;
  address: string;
  hireDate: string;
  workShift: string;
  notes: string;
  certifications: string;
  certificateIssueDate: string;
  certificateExpiryDate: string;
  terminationDate: string;
  technicianPhotoUrl?: string;
  certificateUrl?: string;
  photoName?: string;
  certificateName?: string;
}

@Component({
  selector: 'app-create-technician',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-technician.html',
  styleUrls: ['./create-technician.css']
})
export class CreateTechnicianComponent implements OnInit {
  form: TechnicianForm = this.createEmptyForm();
  isSubmitting = false;
  isEditMode = false;
  editTechnicianId?: number;
  isLoadingDetails = false;
  errorMessage?: string;
  autoGenerateTechnicianId = false;

  technicianTypeOptions = [
    { value: 'FULL_TIME', label: 'Full Time Technician' },
    { value: 'PART_TIME', label: 'Part Time Technician' },
    { value: 'CONTRACT', label: 'Contract' }
  ];

  statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  workShiftOptions = [
    { value: 'DAY_SHIFT', label: 'Day Shift (9AM-5PM)' },
    { value: 'SWING_SHIFT', label: 'Swing Shift (4PM-12AM)' },
    { value: 'NIGHT_SHIFT', label: 'Night Shift (10PM-6AM)' }
  ];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly technicianService: TechnicianService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEditMode = true;
    this.editTechnicianId = Number(id);
    this.loadTechnicianDetails(id);
  }

  onCancel(): void {
    this.router.navigate(['/technicians']);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const operation = this.isEditMode && this.editTechnicianId
      ? this.technicianService.updateTechnician(this.editTechnicianId, this.buildPayload())
      : this.technicianService.createTechnician(this.buildPayload());

    operation.pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        const message = this.isEditMode ? 'Technician updated successfully.' : 'Technician created successfully.';
        this.toastr.success(message);
        this.router.navigate(['/technicians']);
      },
      error: () => {
        this.toastr.error('Unable to save technician. Please try again.');
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.form.technicianPhotoUrl = undefined;
      this.form.photoName = undefined;
      return;
    }
    this.form.technicianPhotoUrl = file.name;
    this.form.photoName = file.name;
  }

  onCertificateSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.form.certificateUrl = undefined;
      this.form.certificateName = undefined;
      return;
    }
    this.form.certificateUrl = file.name;
    this.form.certificateName = file.name;
  }

  get isContractor(): boolean {
    return this.form.technicianType === 'CONTRACT';
  }

  onAutoGenerateTechnicianIdChange(): void {
    if (this.autoGenerateTechnicianId) {
      this.form.technicianId = '';
    }
  }

  private loadTechnicianDetails(id: string): void {
    this.isLoadingDetails = true;

    this.technicianService
      .fetchTechnicianById(id)
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.populateForm(response.data);
          } else {
            this.errorMessage = response.message ?? 'Unable to load technician details.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load technician details. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  private populateForm(data: ApiTechnician): void {
    this.form = {
      technicianId: data.technicianId ?? '',
      badgeNumber: data.badgeNumber ?? '',
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      technicianType: data.technicianType ?? '',
      phoneNumber: data.phoneNumber ?? '',
      email: data.email ?? '',
      status: data.status ?? '',
      skills: data.skills ?? '',
      address: data.address ?? '',
      hireDate: data.hireDate ?? new Date().toISOString().split('T')[0],
      workShift: data.workShift ?? '',
      notes: data.notes ?? '',
      certifications: data.certifications ?? '',
      certificateIssueDate: data.certificateIssueDate ?? '',
      certificateExpiryDate: data.certificateExpiryDate ?? '',
      terminationDate: data.terminationDate ?? '',
      technicianPhotoUrl: data.technicianPhotoUrl,
      certificateUrl: data.certificateUrl,
      photoName: undefined,
      certificateName: undefined
    };
    this.autoGenerateTechnicianId = false;
  }

  private createEmptyForm(): TechnicianForm {
    const today = new Date().toISOString().split('T')[0];
    return {
      technicianId: '',
      badgeNumber: '',
      firstName: '',
      lastName: '',
      technicianType: '',
      phoneNumber: '',
      email: '',
      status: '',
      skills: '',
      address: '',
      hireDate: today,
      workShift: '',
      notes: '',
      certifications: '',
      certificateIssueDate: '',
      certificateExpiryDate: '',
      terminationDate: '',
      technicianPhotoUrl: undefined,
      certificateUrl: undefined,
      photoName: undefined,
      certificateName: undefined
    };
  }

  private buildPayload(): CreateTechnicianPayload {
    return {
      technicianId: this.autoGenerateTechnicianId ? undefined : this.form.technicianId?.trim() || undefined,
      badgeNumber: this.form.badgeNumber?.trim() || undefined,
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      technicianType: this.form.technicianType,
      skills: this.form.skills,
      phoneNumber: this.form.phoneNumber,
      email: this.form.email,
      address: this.form.address,
      status: this.form.status,
      hireDate: this.form.hireDate,
      workShift: this.form.workShift,
      certifications: this.form.certifications,
      certificateIssueDate: this.form.certificateIssueDate || undefined,
      certificateExpiryDate: this.form.certificateExpiryDate || undefined,
      terminationDate: this.isContractor ? this.form.terminationDate || undefined : undefined,
      technicianPhotoUrl: this.form.technicianPhotoUrl,
      certificateUrl: this.form.certificateUrl,
      attachmentUrl: this.form.technicianPhotoUrl || undefined,
      notes: this.form.notes
    };
  }
}
