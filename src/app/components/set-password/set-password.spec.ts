import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SetPasswordComponent } from './set-password';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

describe('SetPasswordComponent', () => {
  let component: SetPasswordComponent;
  let fixture: ComponentFixture<SetPasswordComponent>;

  const routeStub = {
    queryParams: of({ email: 'user@example.com' })
  };

  const routerStub = {
    navigate: vi.fn()
  };

  const userServiceStub = {
    setPassword: vi.fn().mockReturnValue(of({ message: 'Password set' }))
  };

  const toastrStub = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    userServiceStub.setPassword.mockClear();
    routerStub.navigate.mockClear();
    toastrStub.success.mockClear();
    toastrStub.error.mockClear();

    await TestBed.configureTestingModule({
      imports: [SetPasswordComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: Router, useValue: routerStub },
        { provide: UserService, useValue: userServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits and navigates on success', () => {
    component.email = 'user@example.com';
    component.form.setValue({ password: 'Password1234$', confirmPassword: 'Password1234$' });
    component.submit();
    expect(userServiceStub.setPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1234$'
    });
    expect(toastrStub.success).toHaveBeenCalled();
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows error on failure', () => {
    userServiceStub.setPassword.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Failed' } }))
    );
    component.email = 'user@example.com';
    component.form.setValue({ password: 'Password1234$', confirmPassword: 'Password1234$' });
    component.submit();
    expect(toastrStub.error).toHaveBeenCalledWith('Failed');
  });
});
