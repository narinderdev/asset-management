import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  PmTemplateService,
  EmergencyIncidentDetailResponse,
  EmergencyIncidentDetail
} from '../../services/pm-template.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-emergency-maintenance',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-emergency-maintenance.html',
  styleUrls: [
    '../preventive-maintenance/view-preventive-maintenance.css',
    './view-emergency-maintenance.css'
  ]
})
export class ViewEmergencyMaintenanceComponent implements OnInit {
  incident?: EmergencyIncidentDetail;
  isLoading = false;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pmTemplateService: PmTemplateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing emergency incident identifier.';
      return;
    }
    this.loadIncident(id);
  }

  private loadIncident(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.pmTemplateService.fetchEmergencyMaintenanceById(id).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: EmergencyIncidentDetailResponse) => {
        if (response.data) {
          this.incident = response.data;
        } else {
          this.errorMessage = response.message ?? 'Incident not found.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load incident details.';
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/maintenance/emergency']);
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return 'N/A';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }
    return parsed.toLocaleString();
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'N/A';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }
    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
