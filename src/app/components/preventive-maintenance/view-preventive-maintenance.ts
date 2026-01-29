import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  PmTemplateService,
  PreventiveMaintenanceDetailResponse,
  PreventiveMaintenanceDetail
} from '../../services/pm-template.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-preventive-maintenance',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-preventive-maintenance.html',
  styleUrls: ['./view-preventive-maintenance.css']
})
export class ViewPreventiveMaintenanceComponent implements OnInit {
  template?: PreventiveMaintenanceDetail;
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
      this.errorMessage = 'Missing template identifier.';
      return;
    }

    this.loadTemplate(id);
  }

  private loadTemplate(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.pmTemplateService
      .fetchPreventiveMaintenanceById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: PreventiveMaintenanceDetailResponse) => {
          if (response.data) {
            this.template = response.data;
          } else {
            this.errorMessage = response.message ?? 'Template not found.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load template details.';
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/preventive-maintenance']);
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

  formatFrequency(value?: number, unit?: string): string {
    if (!value) {
      return 'N/A';
    }

    const normalized = unit ? this.prettify(unit) : 'Days';
    return `${value} ${normalized}`;
  }

  private prettify(value?: string): string {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
