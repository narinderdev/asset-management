import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateVendorComponent } from './create-vendor';
import { VendorService } from '../../services/vendor.service';
import { ToastrService } from 'ngx-toastr';

class VendorServiceStub {
  fetchVendorById = vi.fn().mockReturnValue(of({ data: null }));
  createVendor = vi.fn().mockReturnValue(of({}));
  updateVendor = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('CreateVendorComponent', () => {
  let component: CreateVendorComponent;
  let fixture: ComponentFixture<CreateVendorComponent>;
  let serviceStub: VendorServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateVendorComponent, RouterTestingModule],
      providers: [
        { provide: VendorService, useClass: VendorServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(VendorService) as unknown as VendorServiceStub;
    fixture = TestBed.createComponent(CreateVendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create vendor when form is valid', () => {
    component.vendor = {
      vendorId: 'V-1',
      vendorName: 'Vendor One',
      taxId: '',
      address: '123',
      contactPerson: 'John',
      email: 'john@example.com',
      phone: '123',
      paymentTerms: 'NET_30',
      rating: '5',
      active: true
    };

    component.onCreate({ valid: true } as any);

    expect(serviceStub.createVendor).toHaveBeenCalled();
  });

  it('should update vendor when in edit mode', () => {
    component.isEditMode = true;
    component.editVendorId = 9;
    component.onCreate({ valid: true } as any);

    expect(serviceStub.updateVendor).toHaveBeenCalled();
    const [id, payload] = serviceStub.updateVendor.mock.calls.at(-1) ?? [];
    expect(id).toBe(9);
    expect(payload).toBeTruthy();
  });
});
