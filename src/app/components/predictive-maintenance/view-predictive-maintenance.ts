import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PmTemplateService } from '../../services/pm-template.service';

@Component({
  selector: 'app-view-predictive-maintenance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-predictive-maintenance.html',
  styleUrls: ['../preventive-maintenance/view-preventive-maintenance.css']
})
export class ViewPredictiveMaintenanceComponent implements OnInit {
  threshold?: any;
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
      this.errorMessage = 'No predictive maintenance id provided.';
      return;
    }
    this.loadThreshold(id);
  }

  goBack(): void {
    this.router.navigate(['/maintenance/predictive']);
  }

  private loadThreshold(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.pmTemplateService
      .fetchPredictiveThresholdById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: data => {
          if (data) {
            this.threshold = data;
            this.errorMessage = undefined;
          } else {
            this.errorMessage = 'Predictive maintenance details not found.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load predictive maintenance details.';
          this.cdr.detectChanges();
        }
      });
  }
}
