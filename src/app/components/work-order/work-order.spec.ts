import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { WorkOrderManagementComponent } from './work-order';
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

describe('WorkOrderManagementComponent', () => {
  let component: WorkOrderManagementComponent;
  let fixture: ComponentFixture<WorkOrderManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderManagementComponent, RouterTestingModule],
      providers: [
        { provide: WorkOrderService, useClass: WorkOrderServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
