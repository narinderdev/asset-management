import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SpinnerComponent } from '../spinner/spinner';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  form!: FormGroup;

  loading = false;
  passwordVisible = false;
  private isBrowser = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  submit() {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = String(this.form.value.email || '').trim().toLowerCase();
    const password = String(this.form.value.password || '').trim();

    this.form.patchValue({ email, password });

    this.loading = true;
    this.authService
      .login({ email, password })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          const token = (response as any)?.data?.token || (response as any)?.token;
          const user = (response as any)?.data?.user;
          const mfaEnabled = (response as any)?.data?.user?.mfaEnabled ?? (response as any)?.data?.mfaEnabled ?? false;
          const passwordExpiryDays =
            (response as any)?.data?.passwordExpiryDate ??
            (response as any)?.data?.user?.passwordExpiryDate ??
            null;
          const technicianId = (response as any)?.data?.technician?.id
            ?? (response as any)?.data?.user?.technician?.id
            ?? (response as any)?.data?.technicianId
            ?? (response as any)?.data?.user?.technicianId;
          const message = response?.message || (isSuccess ? 'Login successful' : 'Invalid credentials');

          if (isSuccess) {
            if (this.isBrowser && token) {
              localStorage.setItem('authToken', token);
              localStorage.setItem('mfaEnabled', String(!!mfaEnabled));
              if (technicianId !== undefined && technicianId !== null) {
                localStorage.setItem('technicianId', String(technicianId));
              } else {
                localStorage.removeItem('technicianId');
              }
              if (user) {
                this.permissionService.setFromUser(user);
              }
            }
            this.toastr.success(message);
            if (passwordExpiryDays !== null && passwordExpiryDays !== undefined) {
              this.toastr.warning(`Password will expire in ${passwordExpiryDays} days`);
            }
            this.router.navigate(['dashboard']);
          } else {
            this.toastr.error(message);
          }
        },
        error: (err: any) => {
          const message = err?.error?.message || 'Login failed. Please try again.';
          this.toastr.error(message);
        }
      });
  }
}
