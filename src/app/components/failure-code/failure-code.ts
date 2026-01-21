import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { FailureCodeService } from '../../services/failure-code.service';

interface FailureCodeEntry {
  symptomCode: string;
  symptomDescription: string;
  causeCode: string;
  causeDescription: string;
  actionCode: string;
  actionDescription: string;
}

interface FailureCodeDto {
  failureSymptomCode?: string;
  symptomDescription?: string;
  failureCauseCode?: string;
  causeDescription?: string;
  actionCode?: string;
  actionDescription?: string;
}

@Component({
  selector: 'app-failure-code',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './failure-code.html',
  styleUrls: ['./failure-code.css']
})
export class FailureCodeComponent implements OnInit {
  entries: FailureCodeEntry[] = [];
  totalEntries = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  errorMessage?: string;

  constructor(
    private router: Router,
    private failureCodeService: FailureCodeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCodes();
  }

  private loadCodes(): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.failureCodeService
      .fetchFailureCodes()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const data = response.data ?? [];
          this.entries = data.map(item => this.mapEntry(item));
          this.totalEntries = this.entries.length;
        },
        error: () => {
          this.errorMessage = 'Unable to load failure codes. Try again later.';
          this.entries = [];
          this.totalEntries = 0;
        }
      });
  }

  private mapEntry(entry: FailureCodeDto): FailureCodeEntry {
    return {
      symptomCode: entry.failureSymptomCode ?? '—',
      symptomDescription: entry.symptomDescription ?? '—',
      causeCode: entry.failureCauseCode ?? '—',
      causeDescription: entry.causeDescription ?? '—',
      actionCode: entry.actionCode ?? '—',
      actionDescription: entry.actionDescription ?? '—'
    };
  }

  addFailureCode(): void {
    this.router.navigate(['/failure-codes/create']);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
    }
  }

  get pagedEntries(): FailureCodeEntry[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.entries.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalEntries / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalEntries) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalEntries) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalEntries);
  }
}
