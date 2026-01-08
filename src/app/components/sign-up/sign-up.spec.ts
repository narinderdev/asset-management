import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { SignupService } from '../../services/signup-service';
import { SignUpComponent } from './sign-up';

describe('SignUpComponent', () => {
  const createComponent = () => {
    const signupService = { signup: vi.fn() } as unknown as SignupService;
    const router = { navigate: vi.fn() } as unknown as Router;
    const toastr = {
      success: vi.fn(),
      error: vi.fn()
    } as unknown as ToastrService;
    const cdr = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;

    return new SignUpComponent(new FormBuilder(), signupService, router, toastr, cdr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('validates that password and confirmation match', () => {
      const instance = createComponent();
      instance.form.patchValue({ password: 'Secret123!', confirmPassword: 'Mismatch' });
      const result = instance.passwordMatchValidator(instance.form);
      expect(result).toEqual({ mismatch: true });
    });

    it('normalizes emails to lowercase on blur', () => {
      const instance = createComponent();
      instance.form.patchValue({ email: 'USER@Example.COM' });
      instance.onEmailBlur();
      expect(instance.form.get('email')?.value).toBe('user@example.com');
    });
  });
});
