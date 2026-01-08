import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewServiceRequestComponent } from './view-service-request';
import { ServiceRequestService } from '../../services/service-request.service';
import { ToastrService } from 'ngx-toastr';

class ServiceRequestServiceStub {
  fetchRequestById = vi.fn().mockReturnValue(of({
    data: { id: '1', status: 'NEW', requesterName: 'Alex', preferredDate: '2025-01-01T00:00:00Z' }
  }));
  convertToWorkOrder = vi.fn().mockReturnValue(of({}));
  approveRequest = vi.fn().mockReturnValue(of({}));
  rejectRequest = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('ViewServiceRequestComponent', () => {
  let component: ViewServiceRequestComponent;
  let fixture: ComponentFixture<ViewServiceRequestComponent>;
  let serviceStub: ServiceRequestServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewServiceRequestComponent, RouterTestingModule],
      providers: [
        { provide: ServiceRequestService, useClass: ServiceRequestServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(ServiceRequestService) as unknown as ServiceRequestServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ViewServiceRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load request on init', () => {
    expect(serviceStub.fetchRequestById).toHaveBeenCalledWith('1');
    expect(component.request?.status).toBe('NEW');
  });

  it('should format status and date values', () => {
    expect(component.formatStatus('UNDER_REVIEW')).toBe('Under Review');
    expect(component.formatDate('')).toBe('-');
  });

  it('should convert to work order', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.request = { id: '1', status: 'NEW' } as any;

    component.onConvert();

    expect(serviceStub.convertToWorkOrder).toHaveBeenCalledWith('1');
    expect(toastrStub.success).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/service-requests']);
  });
});
