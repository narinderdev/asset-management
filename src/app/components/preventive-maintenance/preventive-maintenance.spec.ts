import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PreventiveMaintenanceComponent } from './preventive-maintenance';
import { environment } from '../../../environments/environment';

describe('PreventiveMaintenanceComponent', () => {
  let component: PreventiveMaintenanceComponent;
  let fixture: ComponentFixture<PreventiveMaintenanceComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreventiveMaintenanceComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PreventiveMaintenanceComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 0,
      data: {
        content: [
          {
            pmId: 'PM-001',
            pmName: 'Monthly Check',
            pmType: 'INSPECTION',
            appliesToType: 'ASSET',
            frequencyValue: 30,
            timeUnit: 'DAYS',
            autoGenerateWo: true,
            nextDueDate: '2025-12-16'
          }
        ]
      }
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/pm-templates` && req.params.has('pageable')
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
