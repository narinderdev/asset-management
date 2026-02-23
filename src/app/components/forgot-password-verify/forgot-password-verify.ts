import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-forgot-password-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password-verify.html',
  styleUrls: ['./forgot-password-verify.css']
})
export class ForgotPasswordVerifyComponent {
  code: string[] = Array(6).fill('');
  email = '';
  loading = false;
  errorMessage = '';

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.route.queryParams.subscribe(params => {
      this.email = String(params['email'] ?? '').trim().toLowerCase();
      if (!this.email) {
        this.toastr.error('Email is missing. Please request code again.');
        this.router.navigate(['/forgot-password']);
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  handleInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    this.code[index] = '';
    if (value) {
      this.code[index] = value.slice(-1);
      input.value = this.code[index];

      if (index < this.code.length - 1) {
        this.focusInput(index + 1);
      } else {
        this.submit();
      }
    } else {
      input.value = '';
    }

    this.errorMessage = '';
  }

  handleKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace') {
      if (!this.code[index] && index > 0) {
        this.code[index - 1] = '';
        const prevInput = this.inputs.get(index - 1);
        if (prevInput) {
          prevInput.nativeElement.value = '';
        }
        this.focusInput(index - 1);
      } else {
        this.code[index] = '';
        input.value = '';
      }
    }
  }

  handlePaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '') || '';
    for (let i = 0; i < pastedData.length && index + i < this.code.length; i++) {
      this.code[index + i] = pastedData[i];
      const input = this.inputs.get(index + i);
      if (input) {
        input.nativeElement.value = pastedData[i];
      }
    }
  }

  focusInput(index: number) {
    const input = this.inputs.get(index);
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }

  submit() {
    if (this.loading) {
      return;
    }

    const otp = this.code.join('');
    if (otp.length !== 6) {
      this.errorMessage = 'Enter the 6-digit code.';
      return;
    }

    this.loading = true;
    this.authService
      .verifyEmailMfaCodeForEmail({ email: this.email, code: otp })
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: response => {
          const statusCode = response?.statusCode;
          const status = String(response?.status ?? '').toLowerCase();
          const isSuccess = statusCode === 200 || statusCode === 201 || status === 'success';
          if (!isSuccess) {
            this.toastr.error(response?.message || 'Invalid code.');
            return;
          }
          this.toastr.success(response?.message || 'Code verified.');
          this.router.navigate(['/forgot-password/reset'], {
            queryParams: { email: this.email, otp }
          });
        },
        error: error => {
          const message = error?.error?.message || 'Invalid code. Please try again.';
          this.errorMessage = message;
          this.toastr.error(message);
        }
      });
  }

  useDifferentEmail() {
    this.router.navigate(['/forgot-password'], {
      queryParams: this.email ? { email: this.email } : undefined
    });
  }
}
