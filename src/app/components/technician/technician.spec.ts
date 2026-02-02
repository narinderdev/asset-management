import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TechnicianComponent } from './technician';
import { TechnicianService } from '../../services/technician.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

class TechnicianServiceStub {
  fetchTechnicians = vi.fn().mockReturnValue(of({
    data: {
      technicians: [
        { id: 1, firstName: 'Alex', lastName: 'Smith', technicianType: 'FULL_TIME', address: 'HQ', status: 'ACTIVE' }
      ]
    }
  }));
  deleteTechnician = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('TechnicianComponent', () => {
  let component: TechnicianComponent;
  let fixture: ComponentFixture<TechnicianComponent>;
  let serviceStub: TechnicianServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: PermissionService, useValue: { hasPermission: () => true } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(TechnicianService) as unknown as TechnicianServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TechnicianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load technicians on init', () => {
    expect(serviceStub.fetchTechnicians).toHaveBeenCalled();
    expect(component.technicians.length).toBe(1);
    expect(component.technicians[0].name).toBe('Alex Smith');
  });

  it('should delete technician when confirmed', () => {
    component.canDeleteTechnicians = true;
    component.technicianToDelete = { id: 1, name: 'Alex Smith', availability: 'Active', location: '', role: '', team: '' } as any;
    component.confirmDelete();

    expect(serviceStub.deleteTechnician).toHaveBeenCalledWith(1);
    expect(toastrStub.success).toHaveBeenCalled();
  });
});
