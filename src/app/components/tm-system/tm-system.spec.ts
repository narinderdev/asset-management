import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { TmSystemComponent } from './tm-system';
import { TechnicianService } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService } from '../../services/dashboard.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('TmSystemComponent (dashboard)', () => {
  const paramMap$ = new BehaviorSubject(convertToParamMap({ tab: 'dashboard' }));

  const technicianServiceMock = {
    fetchTechnicians: jasmine.createSpy('fetchTechnicians').and.returnValue(of({ data: { technicians: [] } })),
    fetchTechnicianTeams: jasmine.createSpy('fetchTechnicianTeams').and.returnValue(of({ data: { teams: [] } })),
    fetchLeaves: jasmine.createSpy('fetchLeaves').and.returnValue(of({ data: { leaves: [] } })),
    fetchHolidays: jasmine.createSpy('fetchHolidays').and.returnValue(of({ data: { holidays: [] } }))
  };

  const workOrderServiceMock = {
    fetchWorkOrders: jasmine.createSpy('fetchWorkOrders').and.returnValue(of({ data: { workOrders: [] } }))
  };

  const dashboardServiceMock = {
    fetchTechnicianDashboard: jasmine.createSpy('fetchTechnicianDashboard').and.returnValue(
      of({
        data: {
          totalTechnicians: 3,
          availableToday: 1,
          onLeave: 0,
          workOrders: 29,
          recentActivities: []
        }
      })
    )
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TmSystemComponent],
      providers: [
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() }
        }
      ]
    }).compileComponents();
  });

  it('should create and load dashboard metrics', () => {
    const fixture = TestBed.createComponent(TmSystemComponent);
    fixture.detectChanges(); // triggers ngOnInit and subscriptions
    const comp = fixture.componentInstance;

    expect(comp).toBeTruthy();
    expect(dashboardServiceMock.fetchTechnicianDashboard).toHaveBeenCalled();
    expect(comp.metrics.length).toBe(4);
    expect(comp.metrics[0].label).toBe('Total Technicians');
  });
});
