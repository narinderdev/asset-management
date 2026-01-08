import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../services/user.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './set-password.html',
  styleUrls: ['./set-password.css']
})
export class SetPasswordComponent implements OnInit {
  form: FormGroup;
  submitted = false;
  email = '';
  loading = false;
  errorMessage = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required]
      },
      {
        validators: [this.passwordMatchValidator]
      }
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      if (!this.email) {
        this.errorMessage = 'Invalid link. Email parameter is missing.';
      }
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  submit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email is missing. Please use the link from your email.';
      return;
    }

    this.loading = true;
    const payload = {
      email: this.email,
      password: this.form.value.password
    };

    this.userService.setPassword(payload).subscribe({
      next: response => {
        this.loading = false;
        this.toastr.success(response?.message || 'Password set successfully! You can now login.');
        this.router.navigate(['/login']);
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to set password. Please try again.';
        this.toastr.error(this.errorMessage);
      }
    });
  }
}
