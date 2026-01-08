import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { VerifyOtpComponent } from './verify-otp';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

describe('VerifyOtpComponent', () => {
  let component: VerifyOtpComponent;
  let fixture: ComponentFixture<VerifyOtpComponent>;
  const signupServiceStub = {
    verifyOtp: vi.fn().mockReturnValue(of({ statusCode: 200, data: {}, message: 'ok' }))
  };
  const toastrStub = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyOtpComponent, RouterTestingModule],
      providers: [
        { provide: SignupService, useValue: signupServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ email: 'test@example.com' }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyOtpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
