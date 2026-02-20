import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AssetsService } from '../../services/assets.service';
import { WorkOrderReportComponent } from './work-order-report';

describe('WorkOrderReportComponent', () => {
  let component: WorkOrderReportComponent;
  let fixture: ComponentFixture<WorkOrderReportComponent>;

  const assetsServiceMock = {
    fetchWorkOrderReports: vi.fn()
  };

  beforeEach(async () => {
    assetsServiceMock.fetchWorkOrderReports.mockReset();

    await TestBed.configureTestingModule({
      imports: [WorkOrderReportComponent],
      providers: [{ provide: AssetsService, useValue: assetsServiceMock }]
    }).compileComponents();
  });

  it('should create and load work order rows', () => {
    assetsServiceMock.fetchWorkOrderReports.mockReturnValue(
      of({
        data: {
          totalElements: 1,
          totalPages: 1,
          size: 10,
          workOrders: [
            {
              workOrderId: 'WO-1',
              woTitle: 'Inspect Pump',
              assetName: 'Pump A',
              assignedTechnicianName: 'Alex',
              priority: 'HIGH',
              status: 'IN_PROGRESS'
            }
          ]
        }
      })
    );

    fixture = TestBed.createComponent(WorkOrderReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.rows.length).toBe(1);
    expect(component.rows[0].woId).toBe('WO-1');
    expect(component.rows[0].statusLabel).toBe('IN PROGRESS');
  });
});

