import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateWorkOrderComponent } from './create-work-order';
import { WorkOrderService } from '../../services/work-order.service';
import { AssetsService } from '../../services/assets.service';

describe('CreateWorkOrderComponent', () => {
  let component: CreateWorkOrderComponent;
  let fixture: ComponentFixture<CreateWorkOrderComponent>;
  let router: Router;
  let workOrderService: WorkOrderService;

  beforeEach(async () => {
    const mockWorkOrderService = {
      createWorkOrder: vi.fn().mockReturnValue(of({}))
    };
    const mockAssetsService = {
      fetchAssets: vi.fn().mockReturnValue(of({ data: { content: [{ id: 1, assetName: 'Asset 1' }] } }))
    };

    await TestBed.configureTestingModule({
      imports: [CreateWorkOrderComponent, RouterTestingModule],
      providers: [
        { provide: WorkOrderService, useValue: mockWorkOrderService },
        { provide: AssetsService, useValue: mockAssetsService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    workOrderService = TestBed.inject(WorkOrderService);
    fixture = TestBed.createComponent(CreateWorkOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize target completion date to today', () => {
    expect(component.workOrder.targetCompletionDate).toBe(component.dateToday);
  });

  it('should navigate back on cancel', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/work-orders']);
  });

  it('should call api and navigate after create', () => {
    component.workOrder.workType = 'CORRECTIVE';
    component.workOrder.priority = 'MEDIUM';
    component.workOrder.woTitle = 'Fix machine';
    component.workOrder.descriptionScope = 'Leak in pump';
    component.workOrder.targetCompletionDate = component.dateToday;
    component.workOrder.assetId = 1;
    const createSpy = vi.spyOn(workOrderService, 'createWorkOrder');
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCreate();
    expect(createSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/work-orders']);
  });
});
