import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewProcurementComponent } from './view-procurement';
import { ProcurementService } from '../../services/procurement.service';
import { VendorService } from '../../services/vendor.service';
import { ToastrService } from 'ngx-toastr';

class ProcurementServiceStub {
  fetchMrById = vi.fn().mockReturnValue(of({
    data: { status: 'PENDING', lines: [{ id: 1, requestedQty: 1, uom: 'Each', estimatedUnitPrice: 10 }] }
  }));
  approveMr = vi.fn().mockReturnValue(of({}));
  rejectMr = vi.fn().mockReturnValue(of({}));
  convertMrToPo = vi.fn().mockReturnValue(of({ data: { poId: 5 } }));
}

class VendorServiceStub {
  fetchVendors = vi.fn().mockReturnValue(of({
    data: { content: [{ id: 1, vendorName: 'Vendor 1' }] }
  }));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn()
};

describe('ViewProcurementComponent', () => {
  let component: ViewProcurementComponent;
  let fixture: ComponentFixture<ViewProcurementComponent>;
  let procurementService: ProcurementServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewProcurementComponent, RouterTestingModule],
      providers: [
        { provide: ProcurementService, useClass: ProcurementServiceStub },
        { provide: VendorService, useClass: VendorServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            getCurrentNavigation: () => ({ extras: { state: {} } })
          }
        }
      ]
    }).compileComponents();

    procurementService = TestBed.inject(ProcurementService) as unknown as ProcurementServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ViewProcurementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load MR details on init', () => {
    expect(procurementService.fetchMrById).toHaveBeenCalledWith('1');
    expect(component.mrDetail).toBeDefined();
  });

  it('should expose approval state helpers', () => {
    component.mrDetail = { status: 'APPROVED' } as any;
    expect(component.isApproved).toBeTrue();
    component.mrDetail = { status: 'REJECTED' } as any;
    expect(component.isRejected).toBeTrue();
  });

  it('should create PO when form is valid', () => {
    component.mrId = '1';
    component.mrDetail = { status: 'APPROVED', lines: [{ id: 1, estimatedUnitPrice: 10, requestedQty: 2, uom: 'Each' }] } as any;
    component.poForm.vendorId = 1;

    component.createPo();

    expect(procurementService.convertMrToPo).toHaveBeenCalledWith('1', jasmine.anything());
    expect(toastrStub.success).toHaveBeenCalled();
  });
});
