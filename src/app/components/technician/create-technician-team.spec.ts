import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateTechnicianTeamComponent } from './create-technician-team';
import { TechnicianService } from '../../services/technician.service';
import { ToastrService } from 'ngx-toastr';

class TechnicianServiceStub {
  fetchTechnicianTeamById = vi.fn().mockReturnValue(of({ data: null }));
  createTechnicianTeam = vi.fn().mockReturnValue(of({}));
  updateTechnicianTeam = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('CreateTechnicianTeamComponent', () => {
  let component: CreateTechnicianTeamComponent;
  let fixture: ComponentFixture<CreateTechnicianTeamComponent>;
  let serviceStub: TechnicianServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTechnicianTeamComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(TechnicianService) as unknown as TechnicianServiceStub;
    fixture = TestBed.createComponent(CreateTechnicianTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call createTechnicianTeam when not editing', () => {
    component.form = {
      ...component.form,
      teamName: 'Team A',
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
      teamDescription: 'Team description',
      notes: ''
    };

    component.onSubmit();

    expect(serviceStub.createTechnicianTeam).toHaveBeenCalled();
  });

  it('should call update when in edit mode', () => {
    component.isEditMode = true;
    (component as any).editTeamId = 2;
    component.onSubmit();

    expect(serviceStub.updateTechnicianTeam).toHaveBeenCalledWith(2, jasmine.anything());
  });
});
