import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DashboardService } from '../services/dashboard.service';
import { SecurityDashboardComponent } from './security-dashboard';

describe('SecurityDashboardComponent', () => {
  let fixture: ComponentFixture<SecurityDashboardComponent>;
  let component: SecurityDashboardComponent;

  const dashboardServiceMock = {
    fetchSecurityDashboard: vi.fn()
  };

  beforeEach(async () => {
    dashboardServiceMock.fetchSecurityDashboard.mockReset();

    await TestBed.configureTestingModule({
      imports: [SecurityDashboardComponent],
      providers: [{ provide: DashboardService, useValue: dashboardServiceMock }]
    }).compileComponents();
  });

  it('should create and bind security dashboard data', () => {
    dashboardServiceMock.fetchSecurityDashboard.mockReturnValue(
      of({
        message: 'ok',
        data: {
          thisWeek: {
            period: 'THIS_WEEK',
            kpiSummary: {
              newUsersAdded: 2,
              usersRemovedOrDisabled: 1,
              newRolesAdded: 3,
              roleChanges: 4,
              permissionChanges: 5
            },
            recentUserActivity: [
              {
                actionType: 'LOGIN',
                targetUserName: 'jane',
                performedBy: 'admin',
                dateTime: '2026-02-20T08:00:00Z',
                details: 'ok',
                status: 'SUCCESS'
              }
            ],
            rolePermissionChanges: [],
            securityLog: []
          }
        }
      })
    );

    fixture = TestBed.createComponent(SecurityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(dashboardServiceMock.fetchSecurityDashboard).toHaveBeenCalledWith('THIS_WEEK', 20);
    expect(component.kpis.length).toBe(5);
    expect(component.kpis[0].value).toBe(2);
    expect(component.recentUserActivity.length).toBe(1);
    expect(component.recentUserActivity[0].action).toBe('LOGIN');
    expect(component.isLoading).toBe(false);
  });

  it('should set error message when api call fails', () => {
    dashboardServiceMock.fetchSecurityDashboard.mockReturnValue(
      throwError(() => new Error('network error'))
    );

    fixture = TestBed.createComponent(SecurityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Unable to load security dashboard data.');
    expect(component.isLoading).toBe(false);
  });
});

