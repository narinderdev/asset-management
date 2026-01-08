import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CreatePreventiveMaintenanceComponent } from './create-preventive-maintenance';
import { PmTemplateService } from '../../services/pm-template.service';
import { AssetsService } from '../../services/assets.service';
import { ToastrService } from 'ngx-toastr';

class PmTemplateServiceStub {
  fetchTemplateById = vi.fn().mockReturnValue(of({ data: null }));
  createTemplate = vi.fn().mockReturnValue(of({}));
  updateTemplate = vi.fn().mockReturnValue(of({}));
}

class AssetsServiceStub {
  fetchAssets = vi.fn().mockReturnValue(of({ data: { content: [] } }));
}

const toastrStub = {
  success: vi.fn(),
  error: vi.fn()
};

describe('CreatePreventiveMaintenanceComponent', () => {
  let component: CreatePreventiveMaintenanceComponent;
  let fixture: ComponentFixture<CreatePreventiveMaintenanceComponent>;
  let pmTemplateService: PmTemplateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePreventiveMaintenanceComponent, RouterTestingModule],
      providers: [
        { provide: PmTemplateService, useClass: PmTemplateServiceStub },
        { provide: AssetsService, useClass: AssetsServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        }
      ]
    }).compileComponents();

    pmTemplateService = TestBed.inject(PmTemplateService) as unknown as PmTemplateServiceStub;
    fixture = TestBed.createComponent(CreatePreventiveMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit new template when not in edit mode', () => {
    component.hasLoadedDetails = true;
    component.template = {
      ...component.template,
      pmId: 'PM-1',
      pmName: 'Oil Change',
      pmType: 'INSPECTION',
      appliesToType: 'ASSET',
      assetDbId: 1,
      assetCategory: 'HVAC',
      planStartDate: component.dateToday,
      planEndDate: component.dateToday,
      frequencyType: 'TIME_BASED',
      frequencyValue: '5',
      timeUnit: 'DAYS',
      meterUnit: 'HOURS',
      graceDays: '1',
      generateWOAutomatically: 'Yes',
      leadTimeDays: '2',
      linkedWorkType: 'PREVENTIVE',
      defaultPriority: 'LOW'
    };

    component.onCreate();

    expect(pmTemplateService.createTemplate).toHaveBeenCalled();
    const payload = pmTemplateService.createTemplate.mock.calls.at(-1)?.[0] as any;
    expect(payload.pmName).toBe('Oil Change');
    expect(payload.autoGenerateWo).toBe(true);
  });

  it('should call update when in edit mode', () => {
    component.isEditMode = true;
    component.editTemplateId = 10;
    component.hasLoadedDetails = true;
    component.template = {
      ...component.template,
      pmName: 'Updated Template',
      frequencyValue: '2',
      generateWOAutomatically: 'No',
      defaultPriority: 'HIGH',
      appliesToType: 'ASSET',
      pmType: 'CALIBRATION',
      timeUnit: 'DAYS',
      meterUnit: 'HOURS',
      graceDays: '0',
      linkedWorkType: 'PREVENTIVE',
      assetCategory: '',
      planStartDate: component.dateToday,
      planEndDate: component.dateToday,
      frequencyType: 'TIME_BASED',
      assetDbId: null,
      pmId: '',
      leadTimeDays: '1'
    };

    component.onCreate();

    expect(pmTemplateService.updateTemplate).toHaveBeenCalled();
    const lastCall = pmTemplateService.updateTemplate.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(10);
  });
});
