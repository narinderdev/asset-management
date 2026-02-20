import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InventoryService } from '../../services/inventory.service';
import { InventoryReportComponent } from './inventory-report';

describe('InventoryReportComponent (Transaction tab)', () => {
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
        { provide: ActivatedRoute, useValue: { snapshot: { data: { reportView: 'TRANSACTIONS' } } } }
      ]
    }).compileComponents();
  });

  it('should create and load transactions view report data', () => {
    inventoryServiceMock.fetchWarehouses.mockReturnValue(of({ data: [] }));
    inventoryServiceMock.fetchInventoryReport.mockReturnValue(
      of({
        data: {
          transactions: {
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 10,
            content: [
              {
                transactionType: 'RECEIVE',
                itemName: 'Bearing',
                qtyChange: 10
              }
            ]
          },
          totalQuantityByTxnType: {
            RECEIVE: 10
          }
        }
      })
    );

    fixture = TestBed.createComponent(InventoryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.heading).toBe('Transaction Report');
    expect(component.view).toBe('TRANSACTIONS');
    expect(component.transactions.length).toBe(1);
    expect(component.transactions[0].transactionType).toBe('RECEIVE');
    expect(component.txnTotals.length).toBeGreaterThan(0);
  });
});
