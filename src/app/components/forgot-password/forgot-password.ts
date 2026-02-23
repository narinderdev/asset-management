import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent implements OnInit {
  requestForm: FormGroup;
  loading = false;
  submittedRequest = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    const email = String(this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase();
    if (email) {
      this.requestForm.patchValue({ email });
    }
  }

  sendResetCode() {
    if (this.loading) {
      return;
    }

    this.submittedRequest = true;
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const email = String(this.requestForm.get('email')?.value ?? '').trim().toLowerCase();
    this.requestForm.patchValue({ email });

    this.loading = true;
    this.authService
      .sendEmailMfaCodeForEmail({ email })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const statusCode = response?.statusCode ?? 0;
          const isSuccess = statusCode === 200 || statusCode === 201 || statusCode === 0;
          if (!isSuccess) {
            this.toastr.error(response?.message || 'Failed to send reset code. Please try again.');
            return;
          }

          this.toastr.success(response?.message || 'Reset code sent to your email.');
          this.router.navigate(['/forgot-password/verify'], {
            queryParams: { email }
          });
        },
        error: error => {
          this.toastr.error(error?.error?.message || 'Failed to send reset code. Please try again.');
        }
      });
  }
}
