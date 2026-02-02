import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TechnicianTeamsComponent } from './technician-teams';
import { TechnicianService } from '../../services/technician.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';

class TechnicianServiceStub {
  fetchTechnicianTeams = vi.fn().mockReturnValue(of({
    data: { teams: [{ id: 1, teamName: 'Team One', status: 'ACTIVE' }] }
  }));
  deleteTechnicianTeam = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('TechnicianTeamsComponent', () => {
  let component: TechnicianTeamsComponent;
  let fixture: ComponentFixture<TechnicianTeamsComponent>;
  let serviceStub: TechnicianServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianTeamsComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: PermissionService, useValue: { hasPermission: () => true } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(TechnicianService) as unknown as TechnicianServiceStub;
    fixture = TestBed.createComponent(TechnicianTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load teams on init', () => {
    expect(serviceStub.fetchTechnicianTeams).toHaveBeenCalled();
    expect(component.teams.length).toBe(1);
  });

  it('should delete a team when confirmed', () => {
    component.teamToDelete = { id: 1, teamName: 'Team One', status: 'ACTIVE' } as any;
    component.canDeleteTeams = true;
    component.isDeleteModalOpen = true;

    component.confirmDelete();

    expect(serviceStub.deleteTechnicianTeam).toHaveBeenCalledWith(1);
    expect(toastrStub.success).toHaveBeenCalled();
  });
});
