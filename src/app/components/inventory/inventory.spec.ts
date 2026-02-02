import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { InventoryComponent } from './inventory';
import { environment } from '../../../environments/environment';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryComponent, HttpClientTestingModule],
      providers: [
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 0,
      data: {
        content: [
          {
            itemId: 'ITM-100',
            itemName: 'Bearing',
            category: 'Bearing',
            manufacturer: 'SKF',
            stockLevel: 5,
            reorderPoint: 10,
            costPerUnit: 12.5
          }
        ]
      }
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/inventory-items` && req.params.has('page') && req.params.has('size')
    );
    expect(request.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    request.flush(mockResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
