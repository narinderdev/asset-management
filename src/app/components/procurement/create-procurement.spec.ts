import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateProcurementComponent } from './create-procurement';
import { ProcurementService } from '../../services/procurement.service';
import { InventoryService } from '../../services/inventory.service';

class ProcurementServiceStub {
  createMr = vi.fn().mockReturnValue(of({}));
}

class InventoryServiceStub {
  fetchInventory = vi.fn().mockReturnValue(of({
    data: { content: [{ id: 1, itemName: 'Bearing', itemId: 'IT-1', unitOfMeasure: 'Each' }] }
  }));
  fetchWarehouses = vi.fn().mockReturnValue(of({ data: [] }));
}

describe('CreateProcurementComponent', () => {
  let component: CreateProcurementComponent;
  let fixture: ComponentFixture<CreateProcurementComponent>;
  let procurementService: ProcurementServiceStub;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CreateProcurementComponent, RouterTestingModule],
      providers: [
        { provide: ProcurementService, useClass: ProcurementServiceStub },
        { provide: InventoryService, useClass: InventoryServiceStub }
      ]
    }).compileComponents();

    procurementService = TestBed.inject(ProcurementService) as unknown as ProcurementServiceStub;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CreateProcurementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load item options on init', () => {
    expect(component.itemOptions.length).toBe(1);
    expect(component.itemOptions[0].name).toBe('Bearing');
  });

  it('should populate line when item selected', () => {
    component.lineItems[0].itemId = '1';
    component.onItemSelected(0);
    expect(component.lineItems[0].itemName).toBe('Bearing');
    expect(component.lineItems[0].uom).toBe('Each');
  });

  it('should call createMr on submit', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.lineItems[0] = { itemId: '1', assetId: '', itemName: 'Bearing', qty: 2, uom: 'Each' };

    component.onCreate();

    expect(procurementService.createMr).toHaveBeenCalled();
    const payload = procurementService.createMr.mock.calls.at(-1)?.[0] as any;
    expect(payload.lines.length).toBe(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/procurement']);
  });
});
