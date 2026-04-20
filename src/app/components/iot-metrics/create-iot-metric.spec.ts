import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { CreateIotMetricComponent } from './create-iot-metric';
import { IotMetricService } from '../../services/iot-metric.service';

async function setup(routeParams: Record<string, string> = {}) {
  const iotMetricServiceStub = {
    fetchMetricById: vi.fn().mockReturnValue(
      of({
        data: {
          id: 1,
          metricCode: 'TEMP_01',
          metricName: 'Temperature',
          unit: 'C',
          description: 'Room temperature',
          active: true
        }
      })
    ),
    createMetric: vi.fn().mockReturnValue(of({})),
    updateMetric: vi.fn().mockReturnValue(of({}))
  };

  const toastrStub = {
    success: vi.fn(),
    error: vi.fn()
  };

  await TestBed.configureTestingModule({
    imports: [CreateIotMetricComponent, RouterTestingModule],
    providers: [
      { provide: IotMetricService, useValue: iotMetricServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } }
      },
      { provide: ToastrService, useValue: toastrStub }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(CreateIotMetricComponent);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  fixture.detectChanges();

  return { component, fixture, router, iotMetricServiceStub, toastrStub };
}

describe('CreateIotMetricComponent', () => {
  it('should create in create mode', async () => {
    const { component, iotMetricServiceStub } = await setup();

    expect(component).toBeTruthy();
    expect(component.isEditMode).toBe(false);
    expect(iotMetricServiceStub.fetchMetricById).not.toHaveBeenCalled();
  });

  it('should navigate back on cancel', async () => {
    const { component, router } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onCancel();

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics']);
  });

  it('should validate required metric code and name', async () => {
    const { component, iotMetricServiceStub } = await setup();

    component.metric.metricCode = ' ';
    component.metric.metricName = 'Temp';
    component.onSubmit();
    expect(component.errorMessage).toBe('Metric code is required.');

    component.metric.metricCode = 'TEMP';
    component.metric.metricName = ' ';
    component.onSubmit();
    expect(component.errorMessage).toBe('Metric name is required.');
    expect(iotMetricServiceStub.createMetric).not.toHaveBeenCalled();
  });

  it('should create metric with trimmed payload and navigate', async () => {
    const { component, router, iotMetricServiceStub, toastrStub } = await setup();
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.metric.metricCode = ' TEMP ';
    component.metric.metricName = ' Temperature ';
    component.metric.unit = ' C ';
    component.metric.description = ' desc ';
    component.metric.active = true;

    component.onSubmit();

    expect(iotMetricServiceStub.createMetric).toHaveBeenCalledWith({
      metricCode: 'TEMP',
      metricName: 'Temperature',
      unit: 'C',
      description: 'desc',
      active: true
    });
    expect(toastrStub.success).toHaveBeenCalledWith('IoT metric created successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics']);
  });

  it('should load metric and update in edit mode', async () => {
    const { component, router, iotMetricServiceStub, toastrStub } = await setup({ id: '1' });
    const navigateSpy = vi.spyOn(router, 'navigate');

    expect(component.isEditMode).toBe(true);
    expect(component.metricId).toBe('1');
    expect(iotMetricServiceStub.fetchMetricById).toHaveBeenCalledWith('1');
    expect(component.metric.metricCode).toBe('TEMP_01');

    component.metric.metricName = 'Updated Name';
    component.onSubmit();

    expect(iotMetricServiceStub.updateMetric).toHaveBeenCalled();
    const updateCall = iotMetricServiceStub.updateMetric.mock.calls.at(-1);
    expect(updateCall?.[0]).toBe('1');
    expect((updateCall?.[1] as { metricName: string }).metricName).toBe('Updated Name');
    expect(toastrStub.success).toHaveBeenCalledWith('IoT metric updated successfully.');
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics']);
  });

  it('should handle submit and load errors', async () => {
    const { component, iotMetricServiceStub, toastrStub } = await setup({ id: '1' });

    iotMetricServiceStub.updateMetric.mockReturnValueOnce(
      throwError(() => new Error('update failed'))
    );
    component.onSubmit();
    expect(component.errorMessage).toBe('Unable to update IoT metric. Please try again.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to update IoT metric. Please try again.');

    iotMetricServiceStub.fetchMetricById.mockReturnValueOnce(
      throwError(() => new Error('load failed'))
    );
    component['loadMetric']('2');
    expect(component.errorMessage).toBe('Unable to load IoT metric details.');
  });
});
