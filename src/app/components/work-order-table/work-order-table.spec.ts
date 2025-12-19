import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkOrderTable } from './work-order-table';

describe('WorkOrderTable', () => {
  let component: WorkOrderTable;
  let fixture: ComponentFixture<WorkOrderTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderTable]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
