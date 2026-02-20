import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  const authStub = {
    login: vi.fn().mockReturnValue(of({ statusCode: 200, data: { token: 'token' }, message: 'ok' })),
    sendEmailMfaCode: vi.fn().mockReturnValue(of({ statusCode: 200, message: 'sent' }))
  };
  const toastrStub = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    authStub.login.mockClear();
    authStub.sendEmailMfaCode.mockClear();
    toastrStub.success.mockClear();
    toastrStub.error.mockClear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBe(false);
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBe(true);
  });

  it('should not submit when form is invalid', () => {
    const touchSpy = vi.spyOn(component.form, 'markAllAsTouched');

    component.submit();

    expect(component.loading).toBe(false);
    expect(touchSpy).toHaveBeenCalled();
  });

  it('should navigate to verify-account on successful submit', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.form.setValue({ email: 'user@example.com', password: 'password123' });

    component.submit();
    expect(authStub.sendEmailMfaCode).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/verify-account'], {
      queryParams: { email: 'user@example.com' }
    });
    expect(component.loading).toBe(false);
  });
});
