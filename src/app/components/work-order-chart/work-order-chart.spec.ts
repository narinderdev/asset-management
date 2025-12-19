import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkOrderChart } from './work-order-chart';

describe('WorkOrderChart', () => {
  let component: WorkOrderChart;
  let fixture: ComponentFixture<WorkOrderChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkOrderChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
