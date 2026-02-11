import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { SpinnerComponent } from '../spinner/spinner';
import { SignupService } from '../../services/signup-service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, SpinnerComponent, RouterModule],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css']
})
export class SignUpComponent {
  form: FormGroup;
  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,}$/)]],
        lastName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,}$/)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)
          ]
        ],
        confirmPassword: ['', Validators.required]
      },
      {
        validators: [this.passwordMatchValidator]
      }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  onEmailBlur() {
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      const lowercaseValue = String(emailControl.value).trim().toLowerCase();
      emailControl.setValue(lowercaseValue);
    }
  }

  onPasswordBlur() {
    this.trimControl('password');
  }

  onConfirmPasswordBlur() {
    this.trimControl('confirmPassword');
  }

  private trimControl(controlName: string) {
    const control = this.form.get(controlName);
    if (control && typeof control.value === 'string') {
      const trimmed = control.value.trim();
      if (trimmed !== control.value) {
        control.setValue(trimmed);
      }
    }
  }

  submit() {
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      emailControl.setValue(String(emailControl.value).trim().toLowerCase());
    }
    this.trimControl('password');
    this.trimControl('confirmPassword');

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const signUpData = {
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      email: this.form.value.email,
      password: this.form.value.password
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.signupService
      .signup(signUpData)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const statusCode = response?.statusCode;
          const message = response?.message || 'Signup successful';

          if (statusCode === 201 || statusCode === 202) {
            this.toastr.success(message);

            const userId = response?.data?.id;
            if (userId) {
              localStorage.setItem('signupUserId', String(userId));
            }

            if (this.form.value.email) {
              localStorage.setItem('signupEmail', this.form.value.email);
            }

            this.router.navigate(['/verify-otp'], {
              queryParams: { email: this.form.value.email }
            });
          } else {
            this.toastr.error(message || 'Signup failed');
          }
        },
        error: err => {
          const errorMessage =
            err?.error?.message || 'An error occurred during signup. Please try again.';
          this.toastr.error(errorMessage);
          // Keep console output for debugging purposes
          // eslint-disable-next-line no-console
          console.error('Sign Up Error:', err);
        }
      });
  }
}
