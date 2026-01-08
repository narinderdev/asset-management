import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewTechnicianTeamComponent } from './view-technician-team';
import { TechnicianService } from '../../services/technician.service';

class TechnicianServiceStub {
  fetchTechnicianTeamById = vi.fn().mockReturnValue(of({
    data: { id: 1, teamName: 'Team One', status: 'ACTIVE', members: [{ firstName: 'Alex', lastName: 'Smith' }] }
  }));
}

describe('ViewTechnicianTeamComponent', () => {
  let component: ViewTechnicianTeamComponent;
  let fixture: ComponentFixture<ViewTechnicianTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTechnicianTeamComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewTechnicianTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load team details on init', () => {
    expect(component.team?.teamName).toBe('Team One');
  });

  it('should format helper methods', () => {
    expect(component.formatEnum('ACTIVE')).toBe('Active');
    expect(component.getTechnicianName({ firstName: 'Alex', lastName: 'Smith' } as any)).toBe('Alex Smith');
  });
});
