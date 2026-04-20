import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { IotRulesComponent } from './iot-rules';
import { IotRuleService } from '../../services/iot-rule.service';

describe('IotRulesComponent', () => {
  let component: IotRulesComponent;
  let fixture: ComponentFixture<IotRulesComponent>;
  let router: Router;
  let iotRuleServiceStub: {
    fetchRules: ReturnType<typeof vi.fn>;
    deleteRule: ReturnType<typeof vi.fn>;
  };
  let toastrStub: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    iotRuleServiceStub = {
      fetchRules: vi.fn().mockReturnValue(
        of({
          data: {
            content: [
              {
                id: 1,
                assetId: 2,
                assetName: 'mad',
                metricCode: 'test',
                metricName: 'test',
                ruleOperator: 'BELOW',
                criticalThreshold: 546,
                active: true,
                updatedAt: '2026-04-07T12:57:00.000Z'
              }
            ],
            totalElements: 1,
            size: 10,
            page: 0
          }
        })
      ),
      deleteRule: vi.fn().mockReturnValue(of(void 0))
    };

    toastrStub = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IotRulesComponent, RouterTestingModule],
      providers: [
        { provide: IotRuleService, useValue: iotRuleServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(IotRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load rules on init', () => {
    expect(component).toBeTruthy();
    expect(iotRuleServiceStub.fetchRules).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(component.rules.length).toBe(1);
    expect(component.filteredRules.length).toBe(1);
    expect(component.totalRules).toBe(1);
    expect(component.hasLoaded).toBe(true);
  });

  it('should render loaded row text', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('IoT Rules');
    expect(native.textContent).toContain('mad');
    expect(native.textContent).toContain('test');
    expect(native.textContent).toContain('BELOW');
    expect(native.textContent).toContain('Active');
  });

  it('should navigate on create, view, and edit actions', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.createRule();
    component.viewRule({ id: 5 });
    component.editRule({ id: 5 });
    component.viewRule({});
    component.editRule({});

    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules/create']);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules/view', 5]);
    expect(navigateSpy).toHaveBeenCalledWith(['/iot/rules/edit', 5]);
    expect(navigateSpy).toHaveBeenCalledTimes(3);
  });

  it('should filter rules by search text', () => {
    component.searchText = 'mad';
    component.applyFilter();
    expect(component.filteredRules.length).toBe(1);

    component.searchText = 'unknown';
    component.applyFilter();
    expect(component.filteredRules.length).toBe(0);
  });

  it('should refresh and reload from page zero', () => {
    const loadSpy = vi.spyOn(component, 'loadRules');
    component.currentPage = 3;

    component.refresh();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should paginate when allowed', () => {
    const loadSpy = vi.spyOn(component, 'loadRules');
    component.totalRules = 25;
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
    const loadSpy = vi.spyOn(component, 'loadRules');
    component.totalRules = 10;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = true;

    component.previousPage();
    component.nextPage();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should delete rule when user confirms', () => {
    const loadSpy = vi.spyOn(component, 'loadRules');
    loadSpy.mockClear();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.deleteRule({ id: 1 });

    expect(iotRuleServiceStub.deleteRule).toHaveBeenCalledWith(1);
    expect(toastrStub.success).toHaveBeenCalledWith('IoT rule deleted successfully.');
    expect(loadSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('should not delete when user rejects confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.deleteRule({ id: 1 });

    expect(iotRuleServiceStub.deleteRule).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('should handle load and delete errors', () => {
    iotRuleServiceStub.fetchRules.mockReturnValueOnce(
      throwError(() => new Error('load failed'))
    );
    component.loadRules();

    expect(component.errorMessage).toBe('Unable to load IoT rules.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to load IoT rules. Please try again.');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    iotRuleServiceStub.deleteRule.mockReturnValueOnce(
      throwError(() => new Error('delete failed'))
    );
    component.deleteRule({ id: 1 });
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to delete IoT rule.');
    confirmSpy.mockRestore();
  });
});
