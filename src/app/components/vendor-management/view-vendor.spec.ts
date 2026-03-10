import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { ViewVendorComponent } from './view-vendor';
import { VendorService } from '../../services/vendor.service';
import { PermissionService } from '../../services/permission.service';

class VendorServiceStub {
  fetchVendorById = vi.fn().mockReturnValue(
    of({
      data: {
        id: 1,
        vendorId: 'V-1',
        vendorName: 'Vendor One',
        taxId: '123456789',
        status: 'PENDING',
        paymentTerms: 'NET_30',
        createdAt: '2025-01-01T00:00:00Z'
      }
    })
  );
  approveVendor = vi.fn().mockReturnValue(of({}));
  rejectVendor = vi.fn().mockReturnValue(of({}));
}

describe('ViewVendorComponent', () => {
  let component: ViewVendorComponent;
  let fixture: ComponentFixture<ViewVendorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewVendorComponent, RouterTestingModule],
      providers: [
        { provide: VendorService, useClass: VendorServiceStub },
        { provide: PermissionService, useValue: { hasPermission: vi.fn().mockReturnValue(true) } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewVendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load vendor details', () => {
    expect(component.vendor?.vendorName).toBe('Vendor One');
    expect(component.errorMessage).toBeUndefined();
  });

  it('should format helpers', () => {
    expect(component.formatPaymentTermsLabel('NET_15')).toBe('NET 15');
    expect(component.formatDateString(undefined)).toBe('-');
    expect(component.maskTaxId('123456789')).toBe('*****6789');
  });

  it('should approve pending vendor', () => {
    component.openActionModal('approve');
    component.confirmAction();
    expect(component.vendor?.status).toBe('APPROVED');
  });
});
