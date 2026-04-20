import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { IotAlertsComponent } from './iot-alerts';
import { IotAlertService } from '../../services/iot-alert.service';

describe('IotAlertsComponent', () => {
  let component: IotAlertsComponent;
  let fixture: ComponentFixture<IotAlertsComponent>;
  let iotAlertServiceStub: {
    fetchAlerts: ReturnType<typeof vi.fn>;
    acknowledgeAlert: ReturnType<typeof vi.fn>;
    resolveAlert: ReturnType<typeof vi.fn>;
    suppressAlert: ReturnType<typeof vi.fn>;
  };
  let toastrStub: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    iotAlertServiceStub = {
      fetchAlerts: vi.fn().mockReturnValue(
        of({
          data: {
            content: [
              {
                id: 101,
                severity: 'HIGH',
                status: 'ACTIVE',
                assetName: 'Boiler',
                location: 'Plant A',
                message: 'Temperature threshold exceeded',
                createdAt: '2026-04-09T06:00:00.000Z'
              }
            ],
            page: 0,
            size: 10,
            totalElements: 1
          }
        })
      ),
      acknowledgeAlert: vi.fn().mockReturnValue(of({})),
      resolveAlert: vi.fn().mockReturnValue(of({})),
      suppressAlert: vi.fn().mockReturnValue(of({}))
    };

    toastrStub = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IotAlertsComponent],
      providers: [
        { provide: IotAlertService, useValue: iotAlertServiceStub },
        { provide: ToastrService, useValue: toastrStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IotAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load alerts on init', () => {
    expect(component).toBeTruthy();
    expect(iotAlertServiceStub.fetchAlerts).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(component.alerts.length).toBe(1);
    expect(component.totalAlerts).toBe(1);
    expect(component.hasLoaded).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should render loaded table values', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('IoT Alerts');
    expect(native.textContent).toContain('Temperature threshold exceeded');
    expect(native.textContent).toContain('High');
    expect(native.textContent).toContain('Active');
  });

  it('should show empty state when api returns no alerts', () => {
    iotAlertServiceStub.fetchAlerts.mockReturnValueOnce(
      of({
        data: {
          content: [],
          totalElements: 0,
          page: 0,
          size: 10
        }
      })
    );

    component.loadAlerts();
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    expect(native.textContent).toContain('No IoT alerts found.');
  });

  it('should handle load error and show toast', () => {
    iotAlertServiceStub.fetchAlerts.mockReturnValueOnce(
      throwError(() => new Error('failed'))
    );

    component.loadAlerts();

    expect(component.alerts).toEqual([]);
    expect(component.totalAlerts).toBe(0);
    expect(component.errorMessage).toBe('Unable to load IoT alerts.');
    expect(toastrStub.error).toHaveBeenCalledWith('Unable to load IoT alerts. Please try again.');
    expect(component.hasLoaded).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should paginate next and previous when allowed', () => {
    const loadSpy = vi.spyOn(component, 'loadAlerts');
    component.totalAlerts = 25;
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

  it('should block pagination when loading or at edges', () => {
    const loadSpy = vi.spyOn(component, 'loadAlerts');
    component.totalAlerts = 10;
    component.itemsPerPage = 10;
    component.currentPage = 0;
    component.isLoading = true;

    component.previousPage();
    component.nextPage();

    expect(component.currentPage).toBe(0);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should open and close suppress modal with default datetime', () => {
    const alert = component.alerts[0];

    component.openActionModal('SUPPRESS', alert);

    expect(component.isActionModalOpen).toBe(true);
    expect(component.activeAction?.type).toBe('SUPPRESS');
    expect(component.actionForm.suppressedUntil).toBeTruthy();

    component.closeActionModal();
    expect(component.isActionModalOpen).toBe(false);
    expect(component.activeAction).toBeUndefined();
  });

  it('should submit acknowledge action with default reason', () => {
    const loadSpy = vi.spyOn(component, 'loadAlerts');
    loadSpy.mockClear();
    const alert = component.alerts[0];

    component.openActionModal('ACK', alert);
    component.submitAction();

    expect(iotAlertServiceStub.acknowledgeAlert).toHaveBeenCalledWith(101, {
      reason: 'Acknowledged from web UI'
    });
    expect(toastrStub.success).toHaveBeenCalledWith('Alert acknowledged successfully.');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should submit resolve action with provided reason', () => {
    const alert = component.alerts[0];

    component.openActionModal('RESOLVE', alert);
    component.actionForm.reason = 'Issue handled';
    component.submitAction();

    expect(iotAlertServiceStub.resolveAlert).toHaveBeenCalledWith(101, {
      reason: 'Issue handled'
    });
    expect(toastrStub.success).toHaveBeenCalledWith('Alert resolved successfully.');
  });

  it('should require suppressedUntil for suppress action', () => {
    const alert = component.alerts[0];

    component.openActionModal('SUPPRESS', alert);
    component.actionForm.suppressedUntil = '';
    component.submitAction();

    expect(iotAlertServiceStub.suppressAlert).not.toHaveBeenCalled();
    expect(toastrStub.error).toHaveBeenCalledWith('Suppressed until date/time is required.');
  });

  it('should handle action update failure', () => {
    const alert = component.alerts[0];
    iotAlertServiceStub.acknowledgeAlert.mockReturnValueOnce(
      throwError(() => new Error('update failed'))
    );

    component.openActionModal('ACK', alert);
    component.submitAction();

    expect(toastrStub.error).toHaveBeenCalledWith('Unable to update alert. Please try again.');
    expect(component.isActionSubmitting).toBe(false);
  });

  it('should return expected helper values', () => {
    expect(component.canAcknowledge('ACTIVE')).toBe(true);
    expect(component.canAcknowledge('ACKNOWLEDGED')).toBe(false);
    expect(component.canResolve('SUPPRESSED')).toBe(true);
    expect(component.canSuppress('RESOLVED')).toBe(false);

    expect(component.getSeverityClass('CRITICAL')).toBe('severity-critical');
    expect(component.getStatusClass('AUTO_RESOLVED')).toBe('status-resolved');
    expect(component.formatSeverity('MEDIUM')).toBe('Medium');
    expect(component.formatStatus('AUTO_RESOLVED')).toBe('Auto Resolved');
    expect(component.formatDateTime('not-a-date')).toBe('-');
  });
});
