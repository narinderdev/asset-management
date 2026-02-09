import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { ViewWorkOrderComponent } from './view-work-order';
import { WorkOrderService } from '../../services/work-order.service';
import { TechnicianService } from '../../services/technician.service';
import { InventoryService } from '../../services/inventory.service';

class WorkOrderServiceStub {
  fetchWorkOrderById = vi.fn().mockReturnValue(of({
    data: { id: 1, workOrderId: 'WO-1', status: 'OPEN', targetCompletionDate: '2025-01-01T00:00:00Z', estimatedTotalCost: 150 }
  }));
}

describe('ViewWorkOrderComponent', () => {
  let component: ViewWorkOrderComponent;
  let fixture: ComponentFixture<ViewWorkOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewWorkOrderComponent, RouterTestingModule],
      providers: [
        { provide: WorkOrderService, useClass: WorkOrderServiceStub },
        { provide: TechnicianService, useValue: { fetchTechnicians: vi.fn() } },
        { provide: InventoryService, useValue: { fetchInventory: vi.fn() } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewWorkOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load work order on init', () => {
    expect(component.workOrder?.workOrderId).toBe('WO-1');
    expect(component.errorMessage).toBeUndefined();
  });

  it('should format helpers', () => {
    expect(component.formatDate(undefined)).toBe('--');
    expect(component.formatCurrency(100)).toBe('$100.00');
  });
});
