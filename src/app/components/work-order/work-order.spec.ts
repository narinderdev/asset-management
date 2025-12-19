import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkOrder } from './work-order';

describe('WorkOrder', () => {
  let component: WorkOrder;
  let fixture: ComponentFixture<WorkOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkOrder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
