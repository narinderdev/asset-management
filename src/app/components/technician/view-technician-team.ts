import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { TechnicianService, TechnicianTeamDetailResponse, TechnicianTeamMember } from '../../services/technician.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-technician-team',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-technician-team.html',
  styleUrls: ['./view-technician-team.css']
})
export class ViewTechnicianTeamComponent implements OnInit {
  team?: TechnicianTeamDetailResponse['data'];
  isLoading = false;
  loaded = false;
  errorMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) {
      this.errorMessage = 'Missing technician team identifier.';
      return;
    }
    this.fetchTeam(teamId);
  }

  goBack(): void {
    this.router.navigate(['/technicians/teams']);
  }

  private fetchTeam(id: string): void {
    this.isLoading = true;
    this.loaded = false;
    this.errorMessage = undefined;

    this.technicianService
      .fetchTechnicianTeamById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        if (!this.loaded) {
          this.loaded = true;
          this.cdr.detectChanges();
        }
      }))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.team = response.data;
          } else {
            this.errorMessage = response.message ?? 'Team not found.';
          }
          this.loaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load team details. Please try again later.';
          this.loaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  formatField(value?: string | number | null): string {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    return String(value);
  }

  formatEnum(value?: string): string {
    if (!value) {
      return '-';
    }

    return value
      .split('_')
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(' ');
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  getTechnicianName(tech?: TechnicianTeamMember): string {
    if (!tech) {
      return '-';
    }
    if (tech.fullName) {
      return tech.fullName;
    }
    const names = [tech.firstName, tech.lastName].filter(Boolean);
    return names.join(' ') || '-';
  }

  getInitials(name: string): string {
    if (!name) {
      return '';
    }
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    return initials || '';
  }
}
