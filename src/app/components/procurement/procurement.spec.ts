import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementComponent } from './procurement';

describe('ProcurementComponent', () => {
  let component: ProcurementComponent;
  let fixture: ComponentFixture<ProcurementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcurementComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcurementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
