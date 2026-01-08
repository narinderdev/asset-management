import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';

import { AssetsComponent } from './assets';
import { environment } from '../../../environments/environment';

describe('AssetsComponent', () => {
  let component: AssetsComponent;
  let fixture: ComponentFixture<AssetsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 0,
      data: {
        totalElements: 1,
        size: 20,
        number: 0,
        content: [
          {
            assetId: 'A-1001',
            assetName: 'HVAC Unit',
            assetCategory: 'HVAC',
            assetType: 'Air Condition',
            status: 'IN_SERVICE',
            location: 'Building A',
            warrantyLifecycle: {
              lastMaintenanceDate: '2025-06-24',
              warrantyEnd: '2026-06-24'
            },
            financialDetails: {
              acquisitionDate: '2024-06-24'
            }
          }
        ]
      }
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/assets` && req.params.has('pageable')
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
