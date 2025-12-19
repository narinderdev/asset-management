import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ServiceContractComponent } from './service-contract';
import { environment } from '../../../environments/environment';

describe('ServiceContractComponent', () => {
  let component: ServiceContractComponent;
  let fixture: ComponentFixture<ServiceContractComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceContractComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceContractComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 0,
      data: {
        content: [
          {
            contractId: 'CNTR-01',
            contractName: 'Contract',
            vendorName: 'Vendor A',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            coverageType: 'TIME_AND_MATERIAL',
            responseTimeSlaValue: 4,
            responseTimeSlaUnit: 'HOURS',
            uptimeSlaPercent: 99,
            status: 'ACTIVE'
          }
        ]
      }
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/service-contracts` && req.params.has('pageable')
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
