import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-forgot-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password-reset.html',
  styleUrls: ['./forgot-password-reset.css']
})
export class ForgotPasswordResetComponent {
  form: FormGroup;
  email = '';
  otp = '';
  submitted = false;
  loading = false;
  errorMessage = '';
  passwordVisible = false;
  confirmPasswordVisible = false;
  passwordFocused = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        newPassword: [
          '',
          [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[$@#%\^&*?\-+=])[A-Za-z\d$@#%\^&*?\-+=]{12,}$/)]
        ],
        confirmPassword: ['', Validators.required]
      },
      {
        validators: [this.passwordMatchValidator]
      }
    );

    this.route.queryParams.subscribe(params => {
      this.email = String(params['email'] ?? '').trim().toLowerCase();
      this.otp = String(params['otp'] ?? '').trim();

      if (!this.email || !this.otp) {
        this.toastr.error('Verification step is required first.');
        this.router.navigate(['/forgot-password'], {
          queryParams: this.email ? { email: this.email } : undefined
        });
      }
    });
  }

  private passwordMatchValidator(group: FormGroup) {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'newPassword' | 'confirmPassword') {
    if (field === 'newPassword') {
      this.passwordVisible = !this.passwordVisible;
      return;
    }
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  get passwordValue(): string {
    return String(this.form.get('newPassword')?.value ?? '');
  }

  get showPasswordChecklist(): boolean {
    return this.passwordFocused;
  }

  hasMinLength(password: string): boolean {
    return password.length >= 12;
  }

  hasLowerCase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  hasUpperCase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  hasSpecial(password: string): boolean {
    return /[$@#%\^&*?\-+=]/.test(password);
  }

  onPasswordFocus() {
    this.passwordFocused = true;
  }

  onPasswordBlur() {
    this.passwordFocused = false;
  }

  get showConfirmRequiredError(): boolean {
    const control = this.form.get('confirmPassword');
    return !!control && control.hasError('required') && (this.submitted || control.touched);
  }

  get showMismatchError(): boolean {
    const confirmControl = this.form.get('confirmPassword');
    const hasConfirmValue = !!String(confirmControl?.value ?? '');
    return !!confirmControl && hasConfirmValue && this.form.hasError('mismatch') && (this.submitted || confirmControl.touched);
  }

  submit() {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.otp) {
      this.errorMessage = 'Verification code is missing. Please verify again.';
      this.toastr.error(this.errorMessage);
      return;
    }

    const newPassword = String(this.form.get('newPassword')?.value ?? '');
    this.loading = true;
    this.authService
      .resetPassword({ email: this.email, newPassword, otp: this.otp })
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: response => {
          const statusCode = response?.statusCode ?? 0;
          const isSuccess = statusCode === 200 || statusCode === 201 || statusCode === 0;
          if (!isSuccess) {
            this.toastr.error(response?.message || 'Failed to reset password.');
            return;
          }
          this.toastr.success(response?.message || 'Password reset successful. Please login.');
          this.router.navigate(['/login'], { queryParams: { email: this.email } });
        },
        error: error => {
          this.errorMessage = error?.error?.message || 'Failed to reset password.';
          this.toastr.error(this.errorMessage);
        }
      });
  }
}
