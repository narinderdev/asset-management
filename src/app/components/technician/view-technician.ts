import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiTechnician, TechnicianService } from '../../services/technician.service';

@Component({
  selector: 'app-view-technician',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-technician.html',
  styleUrls: ['./view-technician.css']
})
export class ViewTechnicianComponent implements OnInit {
  technician?: ApiTechnician;
  isLoading = false;
  technicianLoaded = false;
  errorMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const technicianId = this.route.snapshot.paramMap.get('id');
    if (!technicianId) {
      this.errorMessage = 'Missing technician identifier.';
      return;
    }

    this.fetchTechnician(technicianId);
  }

  goBack(): void {
    this.router.navigate(['/technicians']);
  }

  private fetchTechnician(id: string): void {
    this.isLoading = true;
    this.technicianLoaded = false;
    this.errorMessage = undefined;

    this.technicianService
      .fetchTechnicianById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (!this.technicianLoaded) {
            this.technicianLoaded = true;
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.technician = response.data;
          } else {
            this.errorMessage = response.message ?? 'Technician not found.';
          }
          this.technicianLoaded = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load technician details. Please try again later.';
          this.technicianLoaded = true;
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

  formatBoolean(value?: boolean): string {
    if (value === undefined || value === null) {
      return '-';
    }
    return value ? 'Yes' : 'No';
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

  formatEnum(value?: string): string {
    if (!value) {
      return '-';
    }

    return value
      .split('_')
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(' ');
  }
}
