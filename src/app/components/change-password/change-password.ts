import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { UserService } from '../../services/user.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css']
})
export class ChangePasswordComponent {
  form: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';
  currentPasswordVisible = false;
  newPasswordVisible = false;
  confirmPasswordVisible = false;
  newPasswordFocused = false;
  email = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    const emailFromQuery = String(this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase();
    const emailFromStorage = typeof localStorage !== 'undefined'
      ? String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase()
      : '';
    this.email = emailFromQuery || emailFromStorage;

    this.form = this.fb.group(
      {
        currentPassword: ['', Validators.required],
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
  }

  passwordMatchValidator(group: FormGroup) {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'currentPassword' | 'newPassword' | 'confirmPassword') {
    if (field === 'currentPassword') {
      this.currentPasswordVisible = !this.currentPasswordVisible;
      return;
    }
    if (field === 'newPassword') {
      this.newPasswordVisible = !this.newPasswordVisible;
      return;
    }
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  get newPasswordValue(): string {
    return String(this.form.get('newPassword')?.value ?? '');
  }

  get showPasswordChecklist(): boolean {
    return this.newPasswordFocused;
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

  onNewPasswordFocus() {
    this.newPasswordFocused = true;
  }

  onNewPasswordBlur() {
    this.newPasswordFocused = false;
  }

  submit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email is required to change password. Please login again.';
      this.toastr.error(this.errorMessage);
      return;
    }

    this.loading = true;
    this.userService
      .changePassword({
        currentPassword: this.form.value.currentPassword,
        newPassword: this.form.value.newPassword,
        email: this.email
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const statusCode = response?.statusCode ?? 0;
          const isSuccess = statusCode === 200 || statusCode === 201 || statusCode === 0;
          if (!isSuccess) {
            this.errorMessage = response?.message || 'Failed to change password. Please try again.';
            this.toastr.error(this.errorMessage);
            return;
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('passwordExpired', 'false');
            localStorage.removeItem('daysUntilPasswordExpiry');
            localStorage.removeItem('passwordChangeToken');
          }
          this.toastr.success(response?.message || 'Password changed successfully.');
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Failed to change password. Please try again.';
          this.toastr.error(this.errorMessage);
        }
      });
  }
}
