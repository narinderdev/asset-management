import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InventoryService } from '../../services/inventory.service';
import { InventoryReconcileComponent } from './inventory-reconcile';

describe('InventoryReconcileComponent', () => {
  let component: InventoryReconcileComponent;
  let fixture: ComponentFixture<InventoryReconcileComponent>;

  const inventoryServiceMock = {
    fetchInventoryReconciliations: vi.fn(),
    deleteInventoryReconciliation: vi.fn()
  };

  beforeEach(async () => {
    inventoryServiceMock.fetchInventoryReconciliations.mockReset();
    inventoryServiceMock.deleteInventoryReconciliation.mockReset();

    await TestBed.configureTestingModule({
      imports: [InventoryReconcileComponent, RouterTestingModule],
      providers: [
        { provide: InventoryService, useValue: inventoryServiceMock },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();
  });

  it('should create and load reconciliations', () => {
    inventoryServiceMock.fetchInventoryReconciliations.mockReturnValue(
      of({
        data: {
          totalElements: 1,
          number: 0,
          content: [
            {
              id: 10,
              itemName: 'Bearing',
              warehouseName: 'Main Warehouse',
              status: 'SUBMITTED'
            }
          ]
        }
      })
    );

    fixture = TestBed.createComponent(InventoryReconcileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(inventoryServiceMock.fetchInventoryReconciliations).toHaveBeenCalledWith(0, 10);
    expect(component.reconciliations.length).toBe(1);
    expect(component.totalElements).toBe(1);
  });

  it('should set error message when reconciliations api fails', () => {
    inventoryServiceMock.fetchInventoryReconciliations.mockReturnValue(
      throwError(() => new Error('network error'))
    );

    fixture = TestBed.createComponent(InventoryReconcileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Unable to load inventory reconciliations.');
    expect(component.reconciliations.length).toBe(0);
  });
});

