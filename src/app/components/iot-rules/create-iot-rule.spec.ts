import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { CreateIotRuleComponent } from './create-iot-rule';
import { IotRuleService } from '../../services/iot-rule.service';
import { IotMetricService } from '../../services/iot-metric.service';
import { AssetsService } from '../../services/assets.service';

async function setup(routeParams: Record<string, string> = {}) {
  const iotRuleServiceStub = {
    fetchRuleById: vi.fn().mockReturnValue(
      of({
        data: {
          id: 1,
          assetId: 2,
          metricCode: 'TEMP',
          metricName: 'Temperature',
          location: 'Plant A',
          ruleOperator: 'BELOW',
          lowThreshold: 1,
          mediumThreshold: 2,
          highThreshold: 3,
          criticalThreshold: 4,
          cooldownMinutes: 5,
          spikeDelta: 1,
          consecutiveAbnormalCount: 2,
          autoCreateServiceRequest: true,
          active: true
        }
      })
    ),
    createRule: vi.fn().mockReturnValue(of({})),
    updateRule: vi.fn().mockReturnValue(of({}))
  };

  const iotMetricServiceStub = {
    fetchMetrics: vi.fn().mockReturnValue(
      of({
        data: {
          content: [{ metricCode: 'TEMP', metricName: 'Temperature' }]
        }
      })
    )
  };

  const assetsServiceStub = {
    fetchAssets: vi.fn().mockReturnValue(
      of({
        data: {
          content: [
            { id: 2, assetName: 'mad', location: { primaryLocation: 'Plant A' } },
            { id: 3, assetName: 'pump', location: 'Plant B' }
          ]
        }
      })
    )
  };

  const toastrStub = {
    success: vi.fn(),
    error: vi.fn()
  };

  await TestBed.configureTestingModule({
    imports: [CreateIotRuleComponent, RouterTestingModule],
    providers: [
      { provide: IotRuleService, useValue: iotRuleServiceStub },
      { provide: IotMetricService, useValue: iotMetricServiceStub },
      { provide: AssetsService, useValue: assetsServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } }
      },
      { provide: ToastrService, useValue: toastrStub }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(CreateIotRuleComponent);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  fixture.detectChanges();

  return { component, fixture, router, iotRuleServiceStub, iotMetricServiceStub, assetsServiceStub, toastrStub };
}

describe('CreateIotRuleComponent', () => {
  it('should create in create mode and load options', async () => {
    const { component, assetsServiceStub, iotMetricServiceStub, iotRuleServiceStub } = await setup();

    expect(component).toBeTruthy();
    expect(component.isEditMode).toBe(false);
    expect(assetsServiceStub.fetchAssets).toHaveBeenCalledWith(0, 500);
    expect(iotMetricServiceStub.fetchMetrics).toHaveBeenCalledWith({ page: 0, size: 500 });
    expect(iotRuleServiceStub.fetchRuleById).not.toHaveBeenCalled();
    expect(component.assetOptions.length).toBe(2);
    expect(component.metricOptions.length).toBe(1);
  });

  it('should navigate to list on cancel', async () => {
    const { component, router } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCancel();

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules']);
  });

  it('should set location when asset changes', async () => {
    const { component } = await setup();

    component.onAssetChange('3');

    expect(component.form.assetId).toBe('3');
    expect(component.form.location).toBe('Plant B');
  });

  it('should validate missing asset and metric on submit', async () => {
    const { component, iotRuleServiceStub } = await setup();

    component.form.assetId = '';
    component.form.metricCode = '';
    component.onSubmit();
    expect(component.errorMessage).toBe('Asset is required.');

    component.form.assetId = '2';
    component.form.metricCode = '  ';
    component.onSubmit();
    expect(component.errorMessage).toBe('Metric code is required.');
    expect(iotRuleServiceStub.createRule).not.toHaveBeenCalled();
  });

  it('should create rule with numeric payload mapping', async () => {
    const { component, router, iotRuleServiceStub, toastrStub } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.form.assetId = '2';
    component.form.metricCode = ' TEMP ';
    component.form.location = ' Plant A ';
    component.form.ruleOperator = 'ABOVE';
    component.form.lowThreshold = '1.5';
    component.form.mediumThreshold = '2.5';
    component.form.highThreshold = '3.5';
    component.form.criticalThreshold = '4.5';
    component.form.cooldownMinutes = '9.9';
    component.form.spikeDelta = '1.2';
    component.form.consecutiveAbnormalCount = '2.4';
    component.form.autoCreateServiceRequest = true;
    component.form.active = true;

    component.onSubmit();

    expect(iotRuleServiceStub.createRule).toHaveBeenCalledWith({
      assetId: 2,
      metricCode: 'TEMP',
      location: 'Plant A',
      ruleOperator: 'ABOVE',
      lowThreshold: 1.5,
      mediumThreshold: 2.5,
      highThreshold: 3.5,
      criticalThreshold: 4.5,
      cooldownMinutes: 9,
      spikeDelta: 1.2,
      consecutiveAbnormalCount: 2,
      autoCreateServiceRequest: true,
      active: true
    });
    expect(toastrStub.success).toHaveBeenCalledWith('IoT rule created successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules']);
  });

  it('should load and update rule in edit mode', async () => {
    const { component, router, iotRuleServiceStub, toastrStub } = await setup({ id: '1' });
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(component.isEditMode).toBe(true);
    expect(component.ruleId).toBe('1');
    expect(iotRuleServiceStub.fetchRuleById).toHaveBeenCalledWith('1');
    expect(component.form.metricCode).toBe('TEMP');

    component.form.metricCode = 'PRESSURE';
    component.onSubmit();

    expect(iotRuleServiceStub.updateRule).toHaveBeenCalled();
    const updateCall = iotRuleServiceStub.updateRule.mock.calls.at(-1);
    expect(updateCall?.[0]).toBe('1');
    expect((updateCall?.[1] as { metricCode: string }).metricCode).toBe('PRESSURE');
    expect(toastrStub.success).toHaveBeenCalledWith('IoT rule updated successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules']);
  });

  it('should handle submit and load-rule errors', async () => {
    const { component, iotRuleServiceStub, toastrStub } = await setup({ id: '1' });
    iotRuleServiceStub.createRule.mockReturnValueOnce(
      throwError(() => new Error('create failed'))
    );

    component.isEditMode = false;
    component.ruleId = undefined;
    component.form.assetId = '2';
    component.form.metricCode = 'TEMP';
    component.onSubmit();

    expect(component.errorMessage).toBe('Unable to create IoT rule. Please try again.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to create IoT rule. Please try again.');

    iotRuleServiceStub.fetchRuleById.mockReturnValueOnce(
      throwError(() => new Error('load failed'))
    );
    component['loadRule']('9');
    expect(component.errorMessage).toBe('Unable to load IoT rule details.');
  });
});
