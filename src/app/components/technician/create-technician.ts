import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { ApiTechnician, CreateTechnicianPayload, TechnicianService } from '../../services/technician.service';

interface TechnicianForm {
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
      certifications: data.certifications ?? ''
    };
  }

  private createEmptyForm(): TechnicianForm {
    const today = new Date().toISOString().split('T')[0];
    return {
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
      certifications: ''
    };
  }

  private buildPayload(): CreateTechnicianPayload {
    return {
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
      notes: this.form.notes
    };
  }
}
