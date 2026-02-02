import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';
import { of } from 'rxjs';

import { PreventiveMaintenanceComponent } from './preventive-maintenance';
import { PmTemplateService } from '../../services/pm-template.service';
import { PermissionService } from '../../services/permission.service';

class PmTemplateServiceStub {
  fetchPreventiveMaintenance = vi.fn().mockReturnValue(of({
    data: {
      content: [
        {
          id: 1,
          title: 'Monthly Check',
          assetName: 'Asset 1',
          location: 'Plant',
          startDate: '2025-12-16',
          priority: 'HIGH',
          active: true
        }
      ],
      totalElements: 1,
      size: 10,
      number: 0
    }
  }));
}

describe('PreventiveMaintenanceComponent', () => {
  let component: PreventiveMaintenanceComponent;
  let fixture: ComponentFixture<PreventiveMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreventiveMaintenanceComponent],
      providers: [
        { provide: PmTemplateService, useClass: PmTemplateServiceStub },
        { provide: PermissionService, useValue: { hasPermission: () => true } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PreventiveMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
