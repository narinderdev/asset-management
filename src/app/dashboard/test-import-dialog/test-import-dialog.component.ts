import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  RunResponse,
  RunStatus,
  RunStatusResponse,
  TestRunnerService,
  UploadResponse,
} from '../../services/test-runner.service';

@Component({
  selector: 'app-test-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
  ],
  templateUrl: './test-import-dialog.component.html',
  styleUrls: ['./test-import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestImportDialogComponent implements OnDestroy {
  @ViewChild('fileInputEl') fileInput!: ElementRef<HTMLInputElement>;

  readonly form: FormGroup<{ file: FormControl<File | null> }>;

  uploadInfo: UploadResponse | null = null;
  uploadError: string | null = null;
  runError: string | null = null;
  status: RunStatusResponse | null = null;
  logs: string[] = [];

  uploading = false;
  running = false;

  private readonly destroy$ = new Subject<void>();
  private pollingSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<TestImportDialogComponent>,
    private readonly testRunnerService: TestRunnerService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      file: this.fb.control<File | null>(null, Validators.required),
    });
  }

  get selectedFile(): File | null {
    return this.form.controls.file.value;
  }

  get selectedFileName(): string {
    return this.selectedFile?.name ?? 'No file selected';
  }

  get uploadDisabled(): boolean {
    return this.uploading || !this.selectedFile;
  }

  get runDisabled(): boolean {
    return this.running || this.uploading || !this.uploadInfo?.uploadId;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;

    this.uploadError = null;
    this.runError = null;
    this.uploadInfo = null;
    this.status = null;
    this.logs = [];
    this.stopPolling();

    if (!file) {
      this.form.controls.file.setValue(null);
      this.cdr.markForCheck();
      return;
    }

    if (!this.isValidFile(file)) {
      this.uploadError = 'Invalid file type. Please select a CSV, XLS, or XLSX file.';
      this.form.controls.file.setValue(null);
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    this.form.controls.file.setValue(file);
    this.cdr.markForCheck();
  }

  onClearSelectedFile(): void {
    this.form.controls.file.setValue(null);
    this.uploadError = null;
    this.uploadInfo = null;
    this.status = null;
    this.logs = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  onUpload(): void {
    if (this.uploadDisabled || !this.selectedFile) {
      return;
    }

    this.uploading = true;
    this.uploadError = null;
    this.runError = null;
    this.uploadInfo = null;
    this.status = null;
    this.logs = [];

    this.testRunnerService
      .uploadTestData(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: UploadResponse) => {
          this.uploading = false;
          this.uploadInfo = response;
          this.snackBar.open('File uploaded successfully', 'Close', { duration: 2500 });
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.uploading = false;
          this.uploadError = this.extractErrorMessage(error) ?? 'Upload failed. Please try again.';
          this.cdr.markForCheck();
        },
      });
  }

  onRun(): void {
    if (this.runDisabled || !this.uploadInfo?.uploadId) {
      return;
    }

    this.running = true;
    this.runError = null;
    const uploadId = this.uploadInfo.uploadId;

    this.testRunnerService
      .runTests(uploadId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: RunResponse) => {
          this.status = {
            runId: response.runId,
            status: response.status,
            progress: 0,
            logs: [],
          };
          this.startPolling(response.runId);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.running = false;
          this.runError = this.extractErrorMessage(error) ?? 'Unable to start the test run.';
          this.cdr.markForCheck();
        },
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  statusColor(status: RunStatus): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'passed':
        return 'primary';
      case 'running':
      case 'queued':
        return 'accent';
      case 'failed':
      default:
        return 'warn';
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByIndex(index: number): number {
    return index;
  }

  private startPolling(runId: string): void {
    this.stopPolling();

    this.pollingSub = timer(0, 2000)
      .pipe(
        switchMap(() => this.testRunnerService.getRunStatus(runId)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (statusResponse: RunStatusResponse) => {
          this.status = statusResponse;
          this.logs = (statusResponse.logs ?? []).slice(-50);
          const isFinal = statusResponse.status === 'passed' || statusResponse.status === 'failed';
          if (isFinal) {
            this.running = false;
            this.stopPolling();
            const label =
              statusResponse.status === 'passed' ? 'Test run passed' : 'Test run failed';
            this.snackBar.open(label, 'Close', { duration: 3000 });
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.running = false;
          this.runError =
            this.extractErrorMessage(error) ?? 'Error while fetching run status. Polling stopped.';
          this.stopPolling();
          this.cdr.markForCheck();
        },
      });
  }

  private stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  private isValidFile(file: File): boolean {
    const allowedExtensions = ['csv', 'xls', 'xlsx'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return allowedExtensions.includes(extension);
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error) {
      return null;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    const httpError = error as { error?: { message?: string }; message?: string };
    return httpError?.error?.message ?? httpError.message ?? null;
  }
}
