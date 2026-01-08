import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateServiceRequestComponent } from './create-service-request';
import { ServiceRequestService } from '../../services/service-request.service';
import { AssetsService } from '../../services/assets.service';
import { ToastrService } from 'ngx-toastr';

class ServiceRequestServiceStub {
  fetchRequestById = vi.fn().mockReturnValue(of({ data: null }));
  createRequest = vi.fn().mockReturnValue(of({}));
  updateRequest = vi.fn().mockReturnValue(of({}));
}

class AssetsServiceStub {
  fetchAssets = vi.fn().mockReturnValue(of({
    data: { content: [{ id: 1, assetName: 'Generator' }] }
  }));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('CreateServiceRequestComponent', () => {
  let component: CreateServiceRequestComponent;
  let fixture: ComponentFixture<CreateServiceRequestComponent>;
  let serviceStub: ServiceRequestServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateServiceRequestComponent, RouterTestingModule],
      providers: [
        { provide: ServiceRequestService, useClass: ServiceRequestServiceStub },
        { provide: AssetsService, useClass: AssetsServiceStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } }
        },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(ServiceRequestService) as unknown as ServiceRequestServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CreateServiceRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build payload and call create service when not in edit mode', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.assetOptions = [{ id: '1', label: 'Asset 1' }];
    component.request = {
      ...component.request,
      requestId: 'REQ-1',
      requesterName: 'Jane',
      requesterContact: '123',
      department: 'Ops',
      asset: '1',
      location: 'Plant 1',
      maintenanceType: 'corrective',
      priority: 'high',
      shortTitle: 'Pump issue',
      problemDescription: 'Overheating',
      preferredDate: component.dateToday,
      preferredTime: '10:00',
      status: 'NEW',
      safetyRisk: true,
      attachmentUrl: 'http://file'
    };

    component.onCreate();

    expect(serviceStub.createRequest).toHaveBeenCalled();
    const payload = serviceStub.createRequest.mock.calls.at(-1)?.[0] as any;
    expect(payload.assetId).toBe(1);
    expect(payload.maintenanceType).toBe('CORRECTIVE');
    expect(payload.priority).toBe('HIGH');
    expect(navigateSpy).toHaveBeenCalledWith(['/service-requests']);
  });

  it('should call update when in edit mode', () => {
    component.isEditMode = true;
    component.editRequestId = 'REQ-2';
    component.request = {
      ...component.request,
      maintenanceType: 'inspection',
      priority: 'low',
      shortTitle: 'Inspect',
      problemDescription: 'Check',
      status: 'NEW'
    };

    component.onCreate();

    expect(serviceStub.updateRequest).toHaveBeenCalled();
    const call = serviceStub.updateRequest.mock.calls.at(-1);
    expect(call?.[0]).toBe('REQ-2');
  });
});
