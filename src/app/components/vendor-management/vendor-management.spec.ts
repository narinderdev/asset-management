import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { VendorManagementComponent } from './vendor-management';
import { environment } from '../../../environments/environment';

describe('VendorManagementComponent', () => {
  let component: VendorManagementComponent;
  let fixture: ComponentFixture<VendorManagementComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VendorManagementComponent, HttpClientTestingModule],
      providers: [{ provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(VendorManagementComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 0,
      data: {
        content: [
          {
            vendorId: 'VEND-01',
            vendorName: 'ABC Supplies',
            contactPerson: 'Sam Doe',
            email: 'sam@example.com',
            phone: '+1-555-555-0000',
            paymentTerms: 'Net 30',
            rating: 4,
            active: true
          }
        ]
      }
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/vendors` && req.params.has('page') && req.params.has('size')
    );
    expect(request.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    request.flush(mockResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
