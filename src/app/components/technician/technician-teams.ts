import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { TechnicianService, TechnicianTeam } from '../../services/technician.service';
import { PermissionService } from '../../services/permission.service';

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
  canCreateTeams = false;
  canEditTeams = false;
  canDeleteTeams = false;
  currentPage = 0;
  itemsPerPage = 10;
  totalTeams = 0;

  constructor(
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadTeams();
  }

  private setPermissions(): void {
    this.canCreateTeams = this.permissionService.hasPermission('TECHNICIAN_TEAM', 'CREATE');
    this.canEditTeams = this.permissionService.hasPermission('TECHNICIAN_TEAM', 'UPDATE');
    this.canDeleteTeams = this.permissionService.hasPermission('TECHNICIAN_TEAM', 'DELETE');
  }

  addTeam(): void {
    if (!this.canCreateTeams) {
      return;
    }
    this.router.navigate(['/technicians/teams/create']);
  }

  viewTeam(team: TechnicianTeam): void {
    if (!team.id) {
      return;
    }
    this.router.navigate(['/technicians/teams/view', team.id]);
  }

  editTeam(team: TechnicianTeam): void {
    if (!this.canEditTeams) {
      return;
    }
    if (!team.id) {
      return;
    }
    this.router.navigate(['/technicians/teams/edit', team.id]);
  }

  openDeleteModal(team: TechnicianTeam): void {
    if (!this.canDeleteTeams) {
      return;
    }
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
    if (!this.canDeleteTeams || !this.teamToDelete?.id) {
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
    const pageIndex = Math.max(0, this.currentPage);

    this.technicianService
      .fetchTechnicianTeams(pageIndex, this.itemsPerPage)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          this.teams = response.data?.teams ?? [];
          this.totalTeams = response.data?.totalElements ?? this.teams.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          const apiPage = response.data?.page;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.errorMessage = undefined;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = undefined;
          this.toastr.error('Unable to load technician teams.');
          this.cdr.detectChanges();
        }
      });
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.loading) {
      this.currentPage -= 1;
      this.loadTeams();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.loading) {
      this.currentPage += 1;
      this.loadTeams();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalTeams / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalTeams) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalTeams) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalTeams);
  }
}
