import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Company, CompanyService } from '../../services/company.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-company',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-company.html',
  styleUrls: ['./view-company.css']
})
export class ViewCompanyComponent implements OnInit {
  company?: Company;
  isLoading = true;
  errorMessage?: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.errorMessage = 'Missing company identifier.';
      this.isLoading = false;
      return;
    }

    const companyId = Number(idParam);
    if (Number.isNaN(companyId)) {
      this.errorMessage = 'Invalid company identifier.';
      this.isLoading = false;
      return;
    }

    this.companyService
      .fetchCompanyById(companyId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          if (response.data) {
            this.company = response.data;
          } else {
            this.errorMessage = response.message ?? 'Company details not available.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load company details.';
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/company']);
  }

  formatDateString(value?: string): string {
    if (!value) {
      return '-';
    }
    return formatDate(value, 'medium', 'en-US');
  }
}

