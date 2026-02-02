import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ViewPreventiveMaintenanceComponent } from './view-preventive-maintenance';
import { PmTemplateService } from '../../services/pm-template.service';

class PmTemplateServiceStub {
  fetchTemplateById = vi.fn().mockReturnValue(of({
    data: {
      pmName: 'PM Template',
      frequencyValue: 3,
      timeUnit: 'DAYS'
    }
  }));
  fetchPreventiveMaintenanceById = vi.fn().mockReturnValue(of({
    data: {
      title: 'PM Template',
      frequencyValue: 3,
      timeUnit: 'DAYS',
      startDate: '2025-01-01'
    }
  }));
}

describe('ViewPreventiveMaintenanceComponent', () => {
  let component: ViewPreventiveMaintenanceComponent;
  let fixture: ComponentFixture<ViewPreventiveMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewPreventiveMaintenanceComponent, RouterTestingModule],
      providers: [
        { provide: PmTemplateService, useClass: PmTemplateServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewPreventiveMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load template on init', () => {
    expect(component.template).toBeTruthy();
    expect(component.errorMessage).toBeUndefined();
  });

  it('should format frequency and date values', () => {
    expect(component.formatFrequency(5, 'WEEKS')).toBe('5 Weeks');
    expect(component.formatDate(undefined)).toBe('N/A');
  });
});
