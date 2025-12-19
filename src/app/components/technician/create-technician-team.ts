import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import {
  TechnicianService,
  CreateTechnicianTeamPayload,
  TechnicianTeamDetailResponse,
  TechnicianTeamResponse
} from '../../services/technician.service';

interface TechnicianTeamForm extends CreateTechnicianTeamPayload {
  startDate: string;
  endDate: string;
  teamDescription: string;
  notes: string;
}

@Component({
  selector: 'app-create-technician-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-technician-team.html',
  styleUrls: ['./create-technician-team.css']
})
export class CreateTechnicianTeamComponent implements OnInit {
  form: TechnicianTeamForm = this.createEmptyForm();
  isSubmitting = false;
  isEditMode = false;
  isLoadingDetails = false;
  errorMessage?: string;
  statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];
  private editTeamId?: number;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly technicianService: TechnicianService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editTeamId = Number(id);
      this.loadTeamDetails(id);
    }
  }

  onCancel(): void {
    this.router.navigate(['/technicians/teams']);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildPayload();
    const request$: Observable<TechnicianTeamResponse | TechnicianTeamDetailResponse> = this.isEditMode && this.editTeamId
      ? this.technicianService.updateTechnicianTeam(this.editTeamId, payload)
      : this.technicianService.createTechnicianTeam(payload);

    request$
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: () => {
          const message = this.isEditMode ? 'Technician team updated successfully.' : 'Technician team created successfully.';
          this.toastr.success(message);
          this.router.navigate(['/technicians/teams']);
        },
        error: () => {
          const message = this.isEditMode ? 'Unable to update technician team.' : 'Unable to create technician team.';
          this.toastr.error(`${message} Please try again.`);
        }
      });
  }

  private loadTeamDetails(id: string): void {
    this.isLoadingDetails = true;
    this.errorMessage = undefined;

    this.technicianService
      .fetchTechnicianTeamById(id)
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: TechnicianTeamDetailResponse) => {
          if (response.data) {
            this.populateForm(response.data);
          } else {
            this.errorMessage = response.message ?? 'Unable to load team details.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load team details. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  private populateForm(team: TechnicianTeamDetailResponse['data']): void {
    if (!team) {
      return;
    }

    this.form = {
      teamName: team.teamName ?? '',
      status: team.status ?? '',
      startDate: team.startDate ?? '',
      endDate: team.endDate ?? '',
      teamDescription: team.teamDescription ?? '',
      notes: team.notes ?? ''
    };
  }

  private buildPayload(): CreateTechnicianTeamPayload {
    return {
      teamName: this.form.teamName.trim(),
      status: this.form.status,
      startDate: this.form.startDate || undefined,
      endDate: this.form.endDate || undefined,
      teamDescription: this.form.teamDescription.trim(),
      notes: this.form.notes.trim()
    };
  }

  private createEmptyForm(): TechnicianTeamForm {
    return {
      teamName: '',
      status: '',
      startDate: '',
      endDate: '',
      teamDescription: '',
      notes: ''
    };
  }
}
