import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewTechnicianComponent } from './view-technician';
import { TechnicianService } from '../../services/technician.service';

class TechnicianServiceStub {
  fetchTechnicianById = vi.fn().mockReturnValue(of({
    data: { id: 1, firstName: 'Jane', lastName: 'Doe', status: 'ACTIVE', phoneNumber: '123' }
  }));
}

describe('ViewTechnicianComponent', () => {
  let component: ViewTechnicianComponent;
  let fixture: ComponentFixture<ViewTechnicianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTechnicianComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useClass: TechnicianServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewTechnicianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load technician on init', () => {
    expect(component.technician?.firstName).toBe('Jane');
    expect(component.errorMessage).toBeUndefined();
  });

  it('should format helpers gracefully', () => {
    expect(component.formatBoolean(undefined)).toBe('-');
    expect(component.formatField(null)).toBe('-');
    expect(component.formatEnum('FULL_TIME')).toBe('Full Time');
  });
});
