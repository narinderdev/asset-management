import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewInventoryComponent } from './view-inventory';
import { InventoryService } from '../../services/inventory.service';

class InventoryServiceStub {
  fetchInventoryItemById = vi.fn().mockReturnValue(of({
    data: { id: 1, itemName: 'Bearing', createdAt: '2025-01-01T00:00:00Z' }
  }));
}

describe('ViewInventoryComponent', () => {
  let component: ViewInventoryComponent;
  let fixture: ComponentFixture<ViewInventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewInventoryComponent, RouterTestingModule],
      providers: [
        { provide: InventoryService, useClass: InventoryServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load inventory details on init', () => {
    expect(component.inventoryItem).toBeDefined();
    expect(component.errorMessage).toBeUndefined();
  });

  it('should format date gracefully', () => {
    expect(component.formatDate(undefined)).toBe('—');
    expect(component.formatDate('invalid-date')).toBe('—');
  });
});
