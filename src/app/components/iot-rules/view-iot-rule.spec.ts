import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ViewIotRuleComponent } from './view-iot-rule';
import { IotRuleService } from '../../services/iot-rule.service';

async function setup(routeParams: Record<string, string> = {}) {
  const iotRuleServiceStub = {
    fetchRuleById: vi.fn().mockReturnValue(
      of({
        data: {
          id: 1,
          assetId: 2,
          assetName: 'mad',
          metricCode: 'test',
          metricName: 'test',
          location: 'terooooooo',
          ruleOperator: 'BELOW',
          active: true,
          createdAt: '2026-04-07T12:40:00.000Z',
          updatedAt: '2026-04-07T12:57:00.000Z'
        }
      })
    )
  };

  await TestBed.configureTestingModule({
    imports: [ViewIotRuleComponent, RouterTestingModule],
    providers: [
      { provide: IotRuleService, useValue: iotRuleServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(routeParams) } }
      }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(ViewIotRuleComponent);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  fixture.detectChanges();

  return { component, fixture, router, iotRuleServiceStub };
}

describe('ViewIotRuleComponent', () => {
  it('should create and load details when id exists', async () => {
    const { component, iotRuleServiceStub } = await setup({ id: '1' });

    expect(component).toBeTruthy();
    expect(iotRuleServiceStub.fetchRuleById).toHaveBeenCalledWith('1');
    expect(component.rule?.id).toBe(1);
    expect(component.hasLoaded).toBe(true);
    expect(component.errorMessage).toBeUndefined();
  });

  it('should set missing-id error when route id is absent', async () => {
    const { component, iotRuleServiceStub } = await setup();

    expect(iotRuleServiceStub.fetchRuleById).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Missing IoT rule identifier.');
    expect(component.hasLoaded).toBe(true);
  });

  it('should navigate on go back and edit', async () => {
    const { component, router } = await setup({ id: '1' });
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.goBack();
    component.editRule();
    component.rule = undefined;
    component.editRule();

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules']);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules/edit', 1]);
    expect(navigateSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle api error while loading details', async () => {
    const { component, iotRuleServiceStub } = await setup({ id: '1' });
    iotRuleServiceStub.fetchRuleById.mockReturnValueOnce(
      throwError(() => new Error('load failed'))
    );

    component['loadRule']('2');

    expect(component.rule).toBeUndefined();
    expect(component.errorMessage).toBe('Unable to load IoT rule details.');
    expect(component.hasLoaded).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should render key details text', async () => {
    const { fixture } = await setup({ id: '1' });
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('Back to rules');
    expect(native.textContent).toContain('Rule #1');
    expect(native.textContent).toContain('Overview');
    expect(native.textContent).toContain('Audit Information');
    expect(native.textContent).toContain('Threshold Configuration');
  });
});
