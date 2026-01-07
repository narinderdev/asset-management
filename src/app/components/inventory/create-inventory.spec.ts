import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreateInventoryComponent } from './create-inventory';
import { InventoryService } from '../../services/inventory.service';
import { VendorService } from '../../services/vendor.service';

class InventoryServiceStub {
  fetchInventoryItemById = vi.fn().mockReturnValue(of({ data: null }));
  createInventory = vi.fn().mockReturnValue(of({}));
  updateInventory = vi.fn().mockReturnValue(of({}));
}

class VendorServiceStub {
  fetchVendors = vi.fn().mockReturnValue(of({
    data: { content: [{ id: 1, vendorName: 'Vendor A' }] }
  }));
}

describe('CreateInventoryComponent', () => {
  let component: CreateInventoryComponent;
  let fixture: ComponentFixture<CreateInventoryComponent>;
  let serviceStub: InventoryServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateInventoryComponent, RouterTestingModule],
      providers: [
        { provide: InventoryService, useClass: InventoryServiceStub },
        { provide: VendorService, useClass: VendorServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    serviceStub = TestBed.inject(InventoryService) as unknown as InventoryServiceStub;
    fixture = TestBed.createComponent(CreateInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load vendor options on init', () => {
    expect(component.vendorOptions.length).toBe(1);
    expect(component.vendorOptions[0].label).toBe('Vendor A');
  });

  it('should call createInventory when submitting new item', () => {
    component.hasLoadedDetails = true;
    component.inventoryItem = {
      ...component.inventoryItem,
      itemId: 'ITEM-1',
      itemName: 'Bearing',
      category: 'BEARING',
      unitOfMeasure: 'EACH',
      manufacturer: 'Acme',
      manufacturerPartNumber: 'MPN-1',
      stockLevel: 2,
      reorderPoint: 1,
      reorderQuantity: 5,
      costPerUnit: 10,
      minStockLevel: 1,
      maxStockLevel: 10,
      primaryVendorDbId: 1,
      active: true
    };

    component.onCreate();

    expect(serviceStub.createInventory).toHaveBeenCalled();
    const payload = serviceStub.createInventory.mock.calls.at(-1)?.[0] as any;
    expect(payload.itemName).toBe('Bearing');
    expect(payload.stockLevel).toBe(2);
  });

  it('should call updateInventory when in edit mode', () => {
    component.isEditMode = true;
    component.editItemId = 5;
    component.hasLoadedDetails = true;
    component.inventoryItem = {
      ...component.inventoryItem,
      itemId: 'ITEM-2',
      itemName: 'Belt',
      category: 'BELT',
      unitOfMeasure: 'METER',
      manufacturer: '',
      manufacturerPartNumber: '',
      stockLevel: 1,
      reorderPoint: 1,
      reorderQuantity: 1,
      costPerUnit: 1,
      minStockLevel: 1,
      maxStockLevel: 1,
      primaryVendorDbId: null,
      active: false
    };

    component.onCreate();

    expect(serviceStub.updateInventory).toHaveBeenCalled();
    const [idArg, payload] = serviceStub.updateInventory.mock.calls.at(-1) as unknown[] ?? [];
    expect(idArg).toBe(5);
    expect(payload).toBeTruthy();
  });
});
