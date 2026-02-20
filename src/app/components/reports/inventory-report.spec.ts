import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InventoryService } from '../../services/inventory.service';
import { InventoryReportComponent } from './inventory-report';

describe('InventoryReportComponent (Inventory tab)', () => {
  let component: InventoryReportComponent;
  let fixture: ComponentFixture<InventoryReportComponent>;

  const inventoryServiceMock = {
    fetchWarehouses: vi.fn(),
    fetchInventoryReport: vi.fn()
  };

  beforeEach(async () => {
    inventoryServiceMock.fetchWarehouses.mockReset();
    inventoryServiceMock.fetchInventoryReport.mockReset();

    TestBed.overrideComponent(InventoryReportComponent, {
      set: { template: '<div></div>' }
    });

    await TestBed.configureTestingModule({
      imports: [InventoryReportComponent],
      providers: [
        { provide: InventoryService, useValue: inventoryServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { reportView: 'ITEMS' } } } }
      ]
    }).compileComponents();
  });

  it('should create and load items view report data', () => {
    inventoryServiceMock.fetchWarehouses.mockReturnValue(
      of({
        data: [{ id: 1, name: 'Main Warehouse' }]
      })
    );
    inventoryServiceMock.fetchInventoryReport.mockReturnValue(
      of({
        data: {
          items: {
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 10,
            content: [{ itemId: 'INV-1', itemName: 'Bearing', stockLevel: 15 }]
          },
          top5HighStock: [],
          topStockValue: []
        }
      })
    );

    fixture = TestBed.createComponent(InventoryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.heading).toBe('Inventory Report');
    expect(component.view).toBe('ITEMS');
    expect(component.items.length).toBe(1);
    expect(component.items[0].itemName).toBe('Bearing');
  });
});
