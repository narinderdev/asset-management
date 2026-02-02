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
  createPreventiveMaintenance = vi.fn().mockReturnValue(of({}));
  updatePreventiveMaintenance = vi.fn().mockReturnValue(of({}));
}

class AssetsServiceStub {
  fetchAssets = vi.fn().mockReturnValue(of({ data: { content: [] } }));
  fetchAssetTypes = vi.fn().mockReturnValue(of({ data: [] }));
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
      applyTo: 'ASSET',
      assetId: 1,
      location: 'Plant 1',
      title: 'Oil change title',
      priority: 'LOW',
      scheduleType: 'TIME_BASED',
      leadTimeDays: '2',
      startDate: component.dateToday,
      intervalUnit: 'DAYS',
      intervalValue: '5',
      meterType: 'RUN_HOURS',
      meterIntervalValue: '',
      currentMeterReading: '0',
      workType: 'PREVENTIVE'
    };

    component.onCreate();

    expect(pmTemplateService.createPreventiveMaintenance).toHaveBeenCalled();
    const payload = pmTemplateService.createPreventiveMaintenance.mock.calls.at(-1)?.[0] as any;
    expect(payload.title).toBe('Oil change title');
    expect(payload.workType).toBe('PREVENTIVE');
  });

  it('should call update when in edit mode', () => {
    component.isEditMode = true;
    component.editTemplateId = 10;
    component.hasLoadedDetails = true;
    component.template = {
      ...component.template,
      pmName: 'Updated Template',
      intervalValue: '2',
      priority: 'HIGH',
      applyTo: 'ASSET',
      scheduleType: 'TIME_BASED',
      intervalUnit: 'DAYS',
      meterType: 'RUN_HOURS',
      meterIntervalValue: '',
      currentMeterReading: '0',
      workType: 'PREVENTIVE',
      assetId: null,
      pmId: '',
      leadTimeDays: '1'
    };

    component.onCreate();

    expect(pmTemplateService.updatePreventiveMaintenance).toHaveBeenCalled();
    const lastCall = pmTemplateService.updatePreventiveMaintenance.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(10);
  });
});
