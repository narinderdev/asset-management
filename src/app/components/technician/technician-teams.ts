import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { TechnicianService, TechnicianTeam } from '../../services/technician.service';

@Component({
  selector: 'app-technician-teams',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './technician-teams.html',
  styleUrls: ['./technician-teams.css']
})
export class TechnicianTeamsComponent implements OnInit {
  teams: TechnicianTeam[] = [];
  loading = false;
  errorMessage?: string;
  isDeleteModalOpen = false;
  isDeleting = false;
  teamToDelete?: TechnicianTeam;

  constructor(
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  addTeam(): void {
    this.router.navigate(['/technicians/teams/create']);
  }

  viewTeam(team: TechnicianTeam): void {
    if (!team.id) {
      return;
    }
    this.router.navigate(['/technicians/teams/view', team.id]);
  }

  editTeam(team: TechnicianTeam): void {
    if (!team.id) {
      return;
    }
    this.router.navigate(['/technicians/teams/edit', team.id]);
  }

  openDeleteModal(team: TechnicianTeam): void {
    if (!team.id) {
      return;
    }
    this.teamToDelete = team;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.isDeleting = false;
    this.teamToDelete = undefined;
  }

  confirmDelete(): void {
    if (!this.teamToDelete?.id) {
      return;
    }

    this.isDeleting = true;
    this.technicianService.deleteTechnicianTeam(this.teamToDelete.id)
      .pipe(finalize(() => {
        this.isDeleting = false;
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Technician team deleted successfully.');
          this.loadTeams();
          this.closeDeleteModal();
        },
        error: () => {
          this.toastr.error('Unable to delete technician team. Please try again.');
          this.closeDeleteModal();
        }
      });
  }

  private loadTeams(): void {
    this.loading = true;
    this.errorMessage = undefined;

    this.technicianService
      .fetchTechnicianTeams()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          this.teams = response.data?.teams ?? [];
          this.errorMessage = undefined;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load technician teams.';
          this.cdr.detectChanges();
        }
      });
  }
}
