import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProcurementService } from '../../services/procurement.service';
import { ReturnTransactionsComponent } from './return-transactions';

describe('ReturnTransactionsComponent', () => {
  let component: ReturnTransactionsComponent;
  let fixture: ComponentFixture<ReturnTransactionsComponent>;

  const procurementServiceMock = {
    fetchReturnTransactions: vi.fn()
  };

  beforeEach(async () => {
    procurementServiceMock.fetchReturnTransactions.mockReset();

    await TestBed.configureTestingModule({
      imports: [ReturnTransactionsComponent],
      providers: [
        { provide: ProcurementService, useValue: procurementServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();
  });

  it('should create and load return transactions', () => {
    procurementServiceMock.fetchReturnTransactions.mockReturnValue(
      of({
        message: 'ok',
        data: [
          {
            id: 1,
            grnNumber: 'GRN-001',
            itemName: 'Bearing',
            itemId: 'INV-1',
            returnQty: 2,
            returnCost: 100
          }
        ]
      })
    );

    fixture = TestBed.createComponent(ReturnTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(procurementServiceMock.fetchReturnTransactions).toHaveBeenCalled();
    expect(component.rows.length).toBe(1);
    expect(component.rows[0].itemName).toBe('Bearing');
    expect(component.showEmptyState).toBe(false);
  });

  it('should show empty state when api returns no rows', () => {
    procurementServiceMock.fetchReturnTransactions.mockReturnValue(
      of({
        data: []
      })
    );

    fixture = TestBed.createComponent(ReturnTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.rows.length).toBe(0);
    expect(component.showEmptyState).toBe(true);
  });

  it('should set error message when api fails', () => {
    procurementServiceMock.fetchReturnTransactions.mockReturnValue(
      throwError(() => new Error('network error'))
    );

    fixture = TestBed.createComponent(ReturnTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Unable to load return transactions. Please try again.');
    expect(component.rows.length).toBe(0);
    expect(component.showEmptyState).toBe(true);
  });
});

