import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit } from '@angular/core';
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
  technicianIds: number[];
  teamLeaderId: number | null;
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
  isLoadingTechnicians = false;
  isMemberDropdownOpen = false;
  errorMessage?: string;
  statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];
  technicianOptions: { id: number; name: string }[] = [];
  private editTeamId?: number;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly technicianService: TechnicianService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadTechnicians();
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
      notes: team.notes ?? '',
      technicianIds: (team.technicians ?? [])
        .map(tech => tech.id)
        .filter((id): id is number => typeof id === 'number'),
      teamLeaderId: team.teamLeaderId ?? null
    };
  }

  private buildPayload(): CreateTechnicianTeamPayload {
    const technicianIds = (this.form.technicianIds || []).filter((id): id is number => typeof id === 'number');
    return {
      teamName: this.form.teamName.trim(),
      status: this.form.status,
      startDate: this.form.startDate || '',
      endDate: this.form.endDate || '',
      teamDescription: this.form.teamDescription.trim(),
      notes: this.form.notes.trim(),
      technicianIds,
      teamLeaderId: technicianIds.includes(this.form.teamLeaderId as number) ? this.form.teamLeaderId : null
    };
  }

  private createEmptyForm(): TechnicianTeamForm {
    return {
      teamName: '',
      status: '',
      startDate: '',
      endDate: '',
      teamDescription: '',
      notes: '',
      technicianIds: [],
      teamLeaderId: null
    };
  }

  private loadTechnicians(): void {
    this.isLoadingTechnicians = true;
    this.technicianService
      .fetchTechnicians(0, 100)
      .pipe(finalize(() => {
        this.isLoadingTechnicians = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const technicians = response.data?.technicians ?? [];
          this.technicianOptions = technicians
            .map(tech => ({
              id: tech.id ?? 0,
              name: tech.fullName || `${tech.firstName ?? ''} ${tech.lastName ?? ''}`.trim() || 'Unnamed technician'
            }))
            .filter(tech => !!tech.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.technicianOptions = [];
          this.cdr.detectChanges();
        }
      });
  }

  get selectedTechnicianOptions(): { id: number; name: string }[] {
    return this.technicianOptions.filter(opt => this.form.technicianIds.includes(opt.id));
  }

  get selectedMembersLabel(): string {
    if (!this.form.technicianIds.length) {
      return 'Select team members';
    }
    const names = this.selectedTechnicianOptions.map(opt => opt.name);
    if (!names.length) {
      return `${this.form.technicianIds.length} selected`;
    }
    const [first, second, ...rest] = names;
    if (rest.length === 0) {
      return [first, second].filter(Boolean).join(', ');
    }
    return `${first}${second ? ', ' + second : ''} +${rest.length}`;
  }

  toggleMemberDropdown(): void {
    if (this.isLoadingTechnicians) {
      return;
    }
    this.isMemberDropdownOpen = !this.isMemberDropdownOpen;
  }

  closeMemberDropdown(): void {
    this.isMemberDropdownOpen = false;
  }

  toggleTechnicianSelection(id: number, checked: boolean): void {
    if (checked) {
      if (!this.form.technicianIds.includes(id)) {
        this.form.technicianIds = [...this.form.technicianIds, id];
      }
    } else {
      this.form.technicianIds = this.form.technicianIds.filter(existingId => existingId !== id);
      if (this.form.teamLeaderId === id) {
        this.form.teamLeaderId = null;
      }
    }
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: Event): void {
    if (!this.isMemberDropdownOpen) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target)) {
      this.closeMemberDropdown();
      this.cdr.detectChanges();
    }
  }
}
