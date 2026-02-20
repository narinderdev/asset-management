import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { MfaComponent } from './mfa';
import { ToastrService } from 'ngx-toastr';

describe('MfaComponent', () => {
  let component: MfaComponent;
  let fixture: ComponentFixture<MfaComponent>;

  const authServiceMock = {
    getMfaSetup: vi.fn(),
    verifyMfaSetup: vi.fn(),
    disableMfa: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    authServiceMock.getMfaSetup.mockReset();
    authServiceMock.verifyMfaSetup.mockReset();
    authServiceMock.disableMfa.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();

    localStorage.setItem('mfaEnabled', 'false');

    await TestBed.configureTestingModule({
      imports: [MfaComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastrService, useValue: toastrMock }
      ]
    }).compileComponents();
  });

  it('should create and load setup qr data', () => {
    authServiceMock.getMfaSetup.mockReturnValue(
      of({
        data: {
          secret: 'ABC123',
          qrCodeImage: 'data:image/png;base64,TEST'
        }
      })
    );

    fixture = TestBed.createComponent(MfaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(authServiceMock.getMfaSetup).toHaveBeenCalled();
    expect(component.setupSecret).toBe('ABC123');
    expect(component.qrCodeImage).toContain('data:image/png');
  });

  it('should enable mfa on successful otp submit', () => {
    authServiceMock.getMfaSetup.mockReturnValue(of({ data: { secret: 'ABC', qrCodeImage: 'img' } }));
    authServiceMock.verifyMfaSetup.mockReturnValue(
      of({
        statusCode: 200,
        message: 'MFA enabled'
      })
    );

    fixture = TestBed.createComponent(MfaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.otpDigits = ['1', '2', '3', '4', '5', '6'];
    component.submitOtp();

    expect(authServiceMock.verifyMfaSetup).toHaveBeenCalledWith('123456');
    expect(component.mfaEnabled).toBe(true);
    expect(localStorage.getItem('mfaEnabled')).toBe('true');
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('should open disable flow and validate otp length', () => {
    authServiceMock.getMfaSetup.mockReturnValue(of({ data: { secret: 'ABC', qrCodeImage: 'img' } }));
    localStorage.setItem('mfaEnabled', 'true');

    fixture = TestBed.createComponent(MfaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.startDisableFlow();
    expect(component.showDisableForm).toBe(true);

    component.disableOtpDigits = ['1', '2', '', '', '', ''];
    component.disableMfa();
    expect(component.disableError).toBe('Enter the 6-digit code to disable.');
  });
});

