import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateTechnicianComponent } from './create-technician';
import { TechnicianService } from '../../services/technician.service';
import { ToastrService } from 'ngx-toastr';

class TechnicianServiceStub {
  fetchTechnicianById = vi.fn().mockReturnValue(of({ data: null }));
  createTechnician = vi.fn().mockReturnValue(of({}));
  updateTechnician = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('CreateTechnicianComponent', () => {
  let component: CreateTechnicianComponent;
  let fixture: ComponentFixture<CreateTechnicianComponent>;
  let serviceStub: TechnicianServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTechnicianComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(TechnicianService) as unknown as TechnicianServiceStub;
    fixture = TestBed.createComponent(CreateTechnicianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit new technician when not editing', () => {
    component.form = {
      firstName: 'John',
      lastName: 'Doe',
      technicianType: 'FULL_TIME',
      phoneNumber: '123',
      email: 'john@example.com',
      status: 'ACTIVE',
      skills: '',
      address: '',
      hireDate: component.form.hireDate,
      workShift: '',
      notes: '',
      certifications: ''
    };

    component.onSubmit();

    expect(serviceStub.createTechnician).toHaveBeenCalled();
  });

  it('should call update when in edit mode', () => {
    component.isEditMode = true;
    component.editTechnicianId = 8;
    component.onSubmit();

    expect(serviceStub.updateTechnician).toHaveBeenCalled();
    const call = serviceStub.updateTechnician.mock.calls.at(-1);
    expect(call?.[0]).toBe(8);
  });
});
