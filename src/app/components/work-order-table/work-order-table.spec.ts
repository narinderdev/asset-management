import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { WorkOrderTable } from './work-order-table';
import { WorkOrderService } from '../../services/work-order.service';
import { ToastrService } from 'ngx-toastr';

class WorkOrderServiceStub {
  fetchWorkOrders = vi.fn().mockReturnValue(of({ data: { workOrders: [] } }));
  deleteWorkOrder = vi.fn().mockReturnValue(of({}));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('WorkOrderTable', () => {
  let component: WorkOrderTable;
  let fixture: ComponentFixture<WorkOrderTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderTable, RouterTestingModule],
      providers: [
        { provide: WorkOrderService, useClass: WorkOrderServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
