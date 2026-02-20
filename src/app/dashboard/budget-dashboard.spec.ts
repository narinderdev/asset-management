import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetsService } from '../services/assets.service';
import { DashboardService } from '../services/dashboard.service';
import { BudgetDashboardComponent } from './budget-dashboard';

describe('BudgetDashboardComponent', () => {
  let fixture: ComponentFixture<BudgetDashboardComponent>;
  let component: BudgetDashboardComponent;

  const dashboardServiceMock = {
    fetchWorkOrderBudget: vi.fn()
  };

  const assetsServiceMock = {
    fetchAssetReports: vi.fn(),
    fetchWorkOrderReports: vi.fn()
  };

  beforeEach(async () => {
    dashboardServiceMock.fetchWorkOrderBudget.mockReset();
    assetsServiceMock.fetchAssetReports.mockReset();
    assetsServiceMock.fetchWorkOrderReports.mockReset();

    await TestBed.configureTestingModule({
      imports: [BudgetDashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AssetsService, useValue: assetsServiceMock }
      ]
    }).compileComponents();
  });

  it('should create and load initial budget data', () => {
    assetsServiceMock.fetchAssetReports.mockReturnValue(
      of({
        data: {
          content: [{ id: 1, assetName: 'Generator A' }]
        }
      })
    );
    assetsServiceMock.fetchWorkOrderReports.mockReturnValue(
      of({
        data: {
          workOrders: [{ id: 11, title: 'WO Alpha' }]
        }
      })
    );
    dashboardServiceMock.fetchWorkOrderBudget.mockReturnValue(
      of({
        data: {
          totalEstimatedBudget: 1000,
          totalActualBudget: 1200,
          totalVarianceAmount: 200,
          totalVariancePercentage: 20,
          workOrders: [
            {
              id: 11,
              workOrderNumber: 'WO-11',
              title: 'WO Alpha',
              status: 'IN_PROGRESS',
              assetName: 'Generator A',
              estimatedBudget: 1000,
              actualBudget: 1200,
              varianceAmount: 200,
              variancePercentage: 20
            }
          ]
        }
      })
    );

    fixture = TestBed.createComponent(BudgetDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(dashboardServiceMock.fetchWorkOrderBudget).toHaveBeenCalledWith({
      assetId: '',
      workOrderId: '',
      period: 'THIS_MONTH'
    });
    expect(component.workOrders.length).toBe(1);
    expect(component.totalEstimatedBudget).toBe(1000);
    expect(component.totalVariancePercentage).toBe(20);
  });

  it('should reset filters and reload on period change', () => {
    assetsServiceMock.fetchAssetReports.mockReturnValue(of({ data: { content: [] } }));
    assetsServiceMock.fetchWorkOrderReports.mockReturnValue(of({ data: { workOrders: [] } }));
    dashboardServiceMock.fetchWorkOrderBudget.mockReturnValue(of({ data: { workOrders: [] } }));

    fixture = TestBed.createComponent(BudgetDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.assetId = '1';
    component.workOrderId = '22';
    component.onPeriodChange('THIS_WEEK');

    expect(component.period).toBe('THIS_WEEK');
    expect(component.assetId).toBe('');
    expect(component.workOrderId).toBe('');
    expect(dashboardServiceMock.fetchWorkOrderBudget).toHaveBeenCalledWith({
      assetId: '',
      workOrderId: '',
      period: 'THIS_WEEK'
    });
  });
});
