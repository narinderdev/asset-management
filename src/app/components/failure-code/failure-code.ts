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
        },
        error: () => {
          this.errorMessage = 'Unable to load failure codes. Try again later.';
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
}
