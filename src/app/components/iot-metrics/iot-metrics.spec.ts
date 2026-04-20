import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { IotMetricsComponent } from './iot-metrics';
import { IotMetricService } from '../../services/iot-metric.service';

describe('IotMetricsComponent', () => {
  let component: IotMetricsComponent;
  let fixture: ComponentFixture<IotMetricsComponent>;
  let router: Router;
  let iotMetricServiceStub: {
    fetchMetrics: ReturnType<typeof vi.fn>;
  };
  let toastrStub: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    iotMetricServiceStub = {
      fetchMetrics: vi.fn().mockReturnValue(
        of({
          data: {
            content: [
              {
                id: 1,
                metricCode: '234234456747',
                metricName: 'test',
                unit: 'werew567',
                active: true,
                updatedAt: '2026-04-07T12:39:00.000Z'
              }
            ],
            totalElements: 1,
            page: 0,
            size: 10
          }
        })
      )
    };

    toastrStub = {
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IotMetricsComponent, RouterTestingModule],
      providers: [
        { provide: IotMetricService, useValue: iotMetricServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(IotMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load metrics on init', () => {
    expect(component).toBeTruthy();
    expect(iotMetricServiceStub.fetchMetrics).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(component.metrics.length).toBe(1);
    expect(component.filteredMetrics.length).toBe(1);
    expect(component.totalMetrics).toBe(1);
  });

  it('should render loaded row values', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('IoT Metrics');
    expect(native.textContent).toContain('234234456747');
    expect(native.textContent).toContain('werew567');
    expect(native.textContent).toContain('Active');
  });

  it('should navigate to create, view and edit routes', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.createMetric();
    component.viewMetric({ id: 10 });
    component.editMetric({ id: 10 });
    component.viewMetric({});
    component.editMetric({});

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics/create']);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics/view', 10]);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/metrics/edit', 10]);
    expect(navigateSpy).toHaveBeenCalledTimes(3);
  });

  it('should filter by text', () => {
    component.searchText = '234234';
    component.applyFilter();
    expect(component.filteredMetrics.length).toBe(1);

    component.searchText = 'not-found';
    component.applyFilter();
    expect(component.filteredMetrics.length).toBe(0);
  });

  it('should refresh and reload from page zero', () => {
    const loadSpy = vi.spyOn(component, 'loadMetrics');
    component.currentPage = 5;

    component.refresh();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should paginate when allowed', () => {
    const loadSpy = vi.spyOn(component, 'loadMetrics');
    component.totalMetrics = 30;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = false;
    loadSpy.mockClear();

    component.nextPage();
    expect(component.currentPage).toBe(1);
    expect(loadSpy).toHaveBeenCalledTimes(1);

    component.previousPage();
    expect(component.currentPage).toBe(0);
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it('should block pagination at boundaries and while loading', () => {
    const loadSpy = vi.spyOn(component, 'loadMetrics');
    component.totalMetrics = 10;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = true;

    component.previousPage();
    component.nextPage();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should handle load errors', () => {
    iotMetricServiceStub.fetchMetrics.mockReturnValueOnce(
      throwError(() => new Error('load failed'))
    );

    component.loadMetrics();

    expect(component.metrics).toEqual([]);
    expect(component.filteredMetrics).toEqual([]);
    expect(component.totalMetrics).toBe(0);
    expect(component.errorMessage).toBe('Unable to load IoT metrics.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to load IoT metrics. Please try again.');
  });
});
