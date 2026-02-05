import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { TmSystemComponent } from './tm-system';
import { TechnicianService } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService } from '../../services/dashboard.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('TmSystemComponent (TM data tabs)', () => {
  const technicianServiceMock = {
    fetchTechnicians: jasmine.createSpy('fetchTechnicians').and.returnValue(of({ data: { technicians: [] } })),
    fetchTechnicianTeams: jasmine.createSpy('fetchTechnicianTeams').and.returnValue(
      of({
        data: {
          teams: [
            { id: 1, teamName: 'Team A', teamLeaderName: 'Lead', technicians: [{}, {}] }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    ),
    fetchLeaves: jasmine.createSpy('fetchLeaves').and.returnValue(of({ data: { leaves: [] } })),
    fetchHolidays: jasmine.createSpy('fetchHolidays').and.returnValue(
      of({
        data: {
          holidays: [
            { id: 9, holidayName: 'Test Holiday', holidayType: 'NATIONAL', holidayDate: '2026-02-05', notes: 'note' }
          ]
        }
      })
    )
  };

  const workOrderServiceMock = {
    fetchWorkOrders: jasmine.createSpy('fetchWorkOrders').and.returnValue(
      of({
        data: {
          workOrders: [
            { id: 11, workOrderId: 'WO-1', woTitle: 'Fix pump', priority: 'HIGH', status: 'IN_PROGRESS', targetCompletionDate: '2026-02-10' }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    )
  };

  const dashboardServiceMock = {
    fetchTechnicianDashboard: jasmine.createSpy('fetchTechnicianDashboard').and.returnValue(of({ data: {} }))
  };

  const routerMock = { navigate: jasmine.createSpy('navigate') };

  function createComponentWithTab(tab: string) {
    const paramMap$ = new BehaviorSubject(convertToParamMap({ tab }));
    TestBed.overrideProvider(ActivatedRoute, { useValue: { paramMap: paramMap$.asObservable() } });
    const fixture = TestBed.createComponent(TmSystemComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TmSystemComponent],
      providers: [
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ tab: 'dashboard' })) } }
      ]
    }).compileComponents();
  });

  it('loads teams tab data', () => {
    const comp = createComponentWithTab('teams');
    expect(technicianServiceMock.fetchTechnicianTeams).toHaveBeenCalled();
    expect(comp.teamRows.length).toBe(1);
    expect(comp.teamRows[0].name).toBe('Team A');
  });

  it('loads work-orders tab data', () => {
    const comp = createComponentWithTab('work-orders');
    expect(workOrderServiceMock.fetchWorkOrders).toHaveBeenCalled();
    expect(comp.workOrderRows.length).toBe(1);
    expect(comp.workOrderRows[0].name).toBe('Fix pump');
  });

  it('loads holidays list in leaves tab', () => {
    const comp = createComponentWithTab('leaves');
    expect(technicianServiceMock.fetchHolidays).toHaveBeenCalled();
    expect(comp.holidayRows.length).toBe(1);
    expect(comp.holidayRows[0].name).toBe('Test Holiday');
  });
});
