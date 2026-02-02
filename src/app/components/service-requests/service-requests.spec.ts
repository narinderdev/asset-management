import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ServiceRequestsComponent } from './service-requests';
import { ServiceRequestService } from '../../services/service-request.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

class ServiceRequestServiceStub {
  fetchRequests = vi.fn().mockReturnValue(of({
    data: {
      content: [
        {
          id: 1,
          requestId: 'REQ-1',
          requestDate: '2025-01-02T00:00:00Z',
          requesterName: 'Jane',
          shortTitle: 'Leak',
          maintenanceType: 'CORRECTIVE',
          priority: 'HIGH',
          status: 'NEW',
          department: 'Ops'
        }
      ]
    }
  }));
  deleteRequest = vi.fn().mockReturnValue(of({}));
  convertToWorkOrder = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn()
};

describe('ServiceRequestsComponent', () => {
  let component: ServiceRequestsComponent;
  let fixture: ComponentFixture<ServiceRequestsComponent>;
  let serviceStub: ServiceRequestServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceRequestsComponent, RouterTestingModule],
      providers: [
        { provide: ServiceRequestService, useClass: ServiceRequestServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: PermissionService, useValue: { hasPermission: () => true } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(ServiceRequestService) as unknown as ServiceRequestServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ServiceRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and map service requests on init', () => {
    expect(serviceStub.fetchRequests).toHaveBeenCalled();
    expect(component.serviceRequests.length).toBe(1);
    expect(component.serviceRequests[0].priority).toBe('High');
    expect(component.serviceRequests[0].status).toBe('New');
  });

  it('should return correct classes for priority and status', () => {
    expect(component.getPriorityClass('High')).toBe('priority-high');
    expect(component.getStatusClass('Under Review')).toBe('status-under-review');
  });

  it('should delete a request when confirmed', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const request = { apiId: '1', requestId: 'REQ-1', requestDate: '', requester: '', shortTitle: '', maintenanceType: '', priority: 'Low', status: 'New' };
    component.canDeleteRequests = true;
    component.requestToDelete = request as any;
    component.isDeleteModalOpen = true;

    component.confirmDelete();

    expect(serviceStub.deleteRequest).toHaveBeenCalledWith('1');
    expect(toastrStub.success).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled(); // ensure no navigation side-effect
  });
});
