import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InventoryService } from '../../services/inventory.service';
import { InventoryAuditLogsComponent } from './inventory-audit-logs';

describe('InventoryAuditLogsComponent', () => {
  let component: InventoryAuditLogsComponent;
  let fixture: ComponentFixture<InventoryAuditLogsComponent>;

  const inventoryServiceMock = {
    fetchInventoryAuditLogs: vi.fn(),
    searchInventoryAuditLogs: vi.fn()
  };

  beforeEach(async () => {
    inventoryServiceMock.fetchInventoryAuditLogs.mockReset();
    inventoryServiceMock.searchInventoryAuditLogs.mockReset();

    await TestBed.configureTestingModule({
      imports: [InventoryAuditLogsComponent],
      providers: [{ provide: InventoryService, useValue: inventoryServiceMock }]
    }).compileComponents();
  });

  it('should create and load audit logs', () => {
    inventoryServiceMock.fetchInventoryAuditLogs.mockReturnValue(
      of({
        data: {
          totalElements: 1,
          number: 0,
          content: [
            {
              id: 1,
              transactionType: 'IN',
              itemName: 'Bearing'
            }
          ]
        }
      })
    );

    fixture = TestBed.createComponent(InventoryAuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(inventoryServiceMock.fetchInventoryAuditLogs).toHaveBeenCalledWith(0, 20);
    expect(component.logs.length).toBe(1);
    expect(component.totalElements).toBe(1);
  });

  it('should set error message when audit logs api fails', () => {
    inventoryServiceMock.fetchInventoryAuditLogs.mockReturnValue(
      throwError(() => new Error('network error'))
    );

    fixture = TestBed.createComponent(InventoryAuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Unable to load inventory audit logs.');
    expect(component.logs.length).toBe(0);
  });
});

