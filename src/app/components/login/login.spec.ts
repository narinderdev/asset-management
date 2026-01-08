import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule]
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
    expect(component.passwordVisible).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTrue();
  });

  it('should not submit when form is invalid', () => {
    const touchSpy = vi.spyOn(component.form, 'markAllAsTouched');

    component.submit();

    expect(component.loading).toBeFalse();
    expect(touchSpy).toHaveBeenCalled();
  });

  it('should navigate to dashboard on successful submit', () => {
    vi.useFakeTimers();
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.form.setValue({ email: 'user@example.com', password: 'password123' });

    component.submit();
    expect(component.loading).toBeTrue();

    vi.advanceTimersByTime(900);

    expect(navigateSpy).toHaveBeenCalledWith(['dashboard']);
    expect(component.loading).toBeFalse();
    vi.useRealTimers();
  });
});
