import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TechnicianComponent } from './technician';
import { TechnicianService } from '../../services/technician.service';

describe('TechnicianComponent (TM technician list)', () => {
  const technicianServiceMock = {
    fetchTechnicians: jasmine.createSpy('fetchTechnicians').and.returnValue(
      of({
        data: {
          technicians: [
            { id: 1, technicianId: 'TEC-0001', firstName: 'John', lastName: 'Doe', role: 'Tech', team: 'A', status: 'AVAILABLE' }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    ),
    deleteTechnician: jasmine.createSpy('deleteTechnician').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianComponent],
      providers: [{ provide: TechnicianService, useValue: technicianServiceMock }]
    }).compileComponents();
  });

  it('should create and load technicians', () => {
    const fixture = TestBed.createComponent(TechnicianComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp).toBeTruthy();
    expect(technicianServiceMock.fetchTechnicians).toHaveBeenCalled();
    expect(comp.technicians.length).toBe(1);
    expect(comp.technicians[0].id).toBe('TEC-0001');
  });
});
