import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { ProcurementComponent } from './procurement';
import { ProcurementService } from '../../services/procurement.service';

class ProcurementServiceStub {
  fetchRequisitions = vi.fn().mockReturnValue(of({ data: { content: [], totalElements: 0, number: 0, size: 10 } }));
}

describe('ProcurementComponent', () => {
  let component: ProcurementComponent;
  let fixture: ComponentFixture<ProcurementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcurementComponent],
      providers: [
        { provide: ProcurementService, useClass: ProcurementServiceStub },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcurementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
